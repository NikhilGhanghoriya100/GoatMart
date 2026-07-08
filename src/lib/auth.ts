import {NextAuthOptions,getServerSession} from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import connectDB from "./db";
import User from "@/models/User";
export const authOptions:NextAuthOptions={
  providers:[CredentialsProvider({name:"credentials",credentials:{email:{label:"Email",type:"email"},password:{label:"Password",type:"password"}},async authorize(credentials){
    if(!credentials?.email||!credentials?.password)return null;
    await connectDB();
    const user=await User.findOne({email:credentials.email}).select("+password");
    if(!user)return null;
    const isValid=await user.comparePassword(credentials.password);
    if(!isValid)return null;
    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      avatar: user.avatar || "",
      sellerStatus: user.sellerProfile?.status
    } as any;
  }})],
  callbacks:{
    async jwt({token,user}){if(user){token.id=user.id;token.role=(user as any).role;token.avatar=(user as any).avatar;token.sellerStatus=(user as any).sellerStatus;}return token;},
    async session({session,token}){if(token){session.user.id=token.id as string;session.user.role=token.role as string;session.user.avatar=token.avatar as string;session.user.sellerStatus=token.sellerStatus as string;}return session;}
  },
  pages:{signIn:"/login",error:"/login"},
  session:{strategy:"jwt",maxAge:30*24*60*60},
  secret:process.env.NEXTAUTH_SECRET,
};
export const getSession=()=>getServerSession(authOptions);
