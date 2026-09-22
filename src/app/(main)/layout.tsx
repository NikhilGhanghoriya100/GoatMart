// import Header from "@/components/Header";
// import Footer from "@/components/Footer";

// export default function MainLayout({ children }: { children: React.ReactNode }) {
//   return (
//     <div className="flex min-h-screen flex-col w-full max-w-full overflow-x-hidden">
//       <Header />
//       <main className="flex-1 w-full max-w-full overflow-x-hidden">{children}</main>
//       <Footer />
//     </div>
//   );
// }
     

"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Goat detail page par Footer hide rahega
  const isGoatDetailPage = pathname.startsWith("/goat/");

  return (
    <div className="flex min-h-screen flex-col w-full max-w-full overflow-x-hidden">
      <Header />

      <main className="flex-1 w-full max-w-full overflow-x-hidden">
        {children}
      </main>

      {!isGoatDetailPage && <Footer />}
    </div>
  );
}
