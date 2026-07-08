import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { token } = req.nextauth;
    const { pathname } = req.nextUrl;

    if (pathname.startsWith("/admin") && token?.role !== "admin") {
      return NextResponse.redirect(new URL("/login?error=admin_only", req.url));
    }
    if (pathname.startsWith("/seller") && !["seller","admin"].includes(token?.role as string)) {
      return NextResponse.redirect(new URL("/login?error=seller_only", req.url));
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        const pub = ["/","/shop","/goat","/login","/register","/about","/terms","/privacy","/contact","/seller-landing","/api/goats","/api/auth"];
        if (pub.some(p => pathname.startsWith(p))) return true;
        const prot = ["/orders","/wishlist","/profile","/chat","/admin","/seller"];
        if (prot.some(p => pathname.startsWith(p))) return !!token;
        return true;
      },
    },
  }
);

export const config = {
  matcher: ["/orders/:path*","/wishlist/:path*","/profile/:path*","/chat/:path*","/admin/:path*","/seller/:path*","/api/orders/:path*","/api/chat/:path*","/api/user/:path*","/api/upload/:path*","/api/admin/:path*","/api/sellers/:path*"],
};
