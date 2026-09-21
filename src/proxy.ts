import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { token } = req.nextauth;
    const { pathname } = req.nextUrl;

    // RBAC: Admin pages check
    if (pathname.startsWith("/admin") && token?.role !== "admin") {
      return NextResponse.redirect(
        new URL("/login?error=admin_only", req.url)
      );
    }

    // RBAC: Seller pages check
    if (
      pathname.startsWith("/seller") &&
      !["seller", "admin"].includes(token?.role as string)
    ) {
      return NextResponse.redirect(
        new URL("/login?error=seller_only", req.url)
      );
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        // All matched routes (below) require a logged-in user
        return !!token;
      },
    },
  }
);

// IMPORTANT: Only protect UI page routes here.
// API routes handle their own auth via getAuthUser() in security.ts.
// Do NOT add /api/* routes here — withAuth returns 404 for API routes in Next.js 16.
export const config = {
  matcher: [
    "/orders/:path*",
    "/wishlist/:path*",
    "/profile/:path*",
    "/chat/:path*",
    "/admin/:path*",
    "/seller/:path*",
    "/settings/:path*",
  ],
};