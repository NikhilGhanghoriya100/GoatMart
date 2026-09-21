import { NextAuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import connectDB from "./db";
import User from "@/models/User";

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
