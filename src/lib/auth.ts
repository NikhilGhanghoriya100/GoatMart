import { NextAuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import connectDB from "./db";
import User from "@/models/User";

async function verifyFirebaseGoogleToken(idToken: string): Promise<{
  email: string;
  name?: string;
  picture?: string;
  uid?: string;
} | null> {
  try {
    const tokenUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
    const response = await fetch(tokenUrl);

    if (response.ok) {
      const data = await response.json();
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

      if (projectId && data.aud && data.aud !== projectId) {
        console.warn("Firebase token aud mismatch:", data.aud, "expected:", projectId);
      }

      if (data.email) {
        return {
          email: data.email,
          name: data.name || "",
          picture: data.picture || "",
          uid: data.user_id || data.sub || "",
        };
      }
    }

    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (apiKey) {
      const lookupUrl = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`;
      const lookupRes = await fetch(lookupUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (lookupRes.ok) {
        const lookupData = await lookupRes.json();
        const firebaseUser = lookupData.users?.[0];
        if (firebaseUser && firebaseUser.email) {
          return {
            email: firebaseUser.email,
            name: firebaseUser.displayName || "",
            picture: firebaseUser.photoUrl || "",
            uid: firebaseUser.localId || "",
          };
        }
      }
    }

    return null;
  } catch (err) {
    console.error("Firebase token verification error:", err);
    return null;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const email = credentials.email.toLowerCase().trim();
        await connectDB();

        const user = await User.findOne({ email }).select("+password");
        if (!user) {
          throw new Error("Invalid email or password");
        }

        const isValid = await user.comparePassword(credentials.password);
        if (!isValid) {
          throw new Error("Invalid email or password");
        }

        // Check if seller account is suspended
        if (user.role === "seller" && user.sellerProfile?.status === "suspended") {
          throw new Error("Your seller account has been suspended. Please contact support.");
        }

        // Clean avatar to avoid putting huge base64 strings in JWT cookie
        const safeAvatar =
          user.avatar && (user.avatar.startsWith("http") || user.avatar.startsWith("/"))
            ? user.avatar
            : "";

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          avatar: safeAvatar,
          sellerStatus: user.sellerProfile?.status || (user.role === "seller" ? "pending" : "customer"),
        };
      },
    }),
    CredentialsProvider({
      id: "firebase-google",
      name: "Firebase Google",
      credentials: {
        idToken: { label: "ID Token", type: "text" },
        role: { label: "Role", type: "text" },
        farmName: { label: "Farm Name", type: "text" },
        farmLocation: { label: "Farm Location", type: "text" },
        phone: { label: "Phone", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.idToken) {
          throw new Error("Google authentication token is missing");
        }

        const verified = await verifyFirebaseGoogleToken(credentials.idToken);
        if (!verified || !verified.email) {
          throw new Error("Invalid or expired Google authentication");
        }

        const email = verified.email.toLowerCase().trim();
        await connectDB();

        let user = await User.findOne({ email });

        if (user) {
          // Existing user: preserve existing role, sellerProfile, password
          if (user.role === "seller" && user.sellerProfile?.status === "suspended") {
            throw new Error("Your seller account has been suspended. Please contact support.");
          }

          let needsSave = false;
          if (!user.firebaseUid && verified.uid) {
            user.firebaseUid = verified.uid;
            needsSave = true;
          }
          if (!user.avatar && verified.picture) {
            user.avatar = verified.picture;
            needsSave = true;
          }
          if (needsSave) {
            await user.save();
          }
        } else {
          // New user: strictly create default customer account (sellers must register manually via form)
          const cleanName = verified.name || email.split("@")[0];

          user = await User.create({
            name: cleanName,
            email,
            role: "customer",
            avatar: verified.picture || "",
            firebaseUid: verified.uid || "",
            authProvider: "google",
            isEmailVerified: true,
          });
        }

        const safeAvatar =
          user.avatar && (user.avatar.startsWith("http") || user.avatar.startsWith("/"))
            ? user.avatar
            : "";

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          avatar: safeAvatar,
          sellerStatus: user.sellerProfile?.status || (user.role === "seller" ? "pending" : "customer"),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.role = (user as any).role;
        token.avatar = (user as any).avatar || "";
        token.sellerStatus = (user as any).sellerStatus || ((user as any).role === "seller" ? "pending" : "approved");
      }
      if (trigger === "update" && session) {
        if (session.name) token.name = session.name;
        if (session.email) token.email = session.email;
        if (session.avatar) {
          token.avatar =
            session.avatar.startsWith("http") || session.avatar.startsWith("/")
              ? session.avatar
              : "";
        }
        if (session.sellerStatus) token.sellerStatus = session.sellerStatus;
      }
      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.name = (token.name as string) || "";
        session.user.email = (token.email as string) || "";
        session.user.role = (token.role as string) || "customer";
        session.user.avatar = (token.avatar as string) || "";
        session.user.sellerStatus = (token.sellerStatus as string) || (session.user.role === "seller" ? "pending" : "approved");
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET || "bakrawale-super-secret-jwt-key-2026-production",
};

export const getSession = () => getServerSession(authOptions);
