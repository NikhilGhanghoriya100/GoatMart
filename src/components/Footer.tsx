import Link from "next/link";
const LINKS={Marketplace:[{label:"Browse Goats",href:"/shop"},{label:"Premium Listings",href:"/shop"}],Support:[{label:"Live Chat",href:"/chat"},{label:"Order Tracking",href:"/orders"},{label:"Contact Us",href:"/contact"}],Company:[{label:"About Us",href:"/about"},{label:"Privacy Policy",href:"/privacy"},{label:"Terms & Conditions",href:"/terms"}]};
export default function Footer(){
  return(
    <footer className="bg-[#0f0f0f] text-gray-500 pt-12 pb-6 mt-0">
      <div className="max-w-[1280px] mx-auto px-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-10">
          <div className="col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2.5 mb-3"><div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#c8a96e] to-[#8b5e2a] flex items-center justify-center text-base text-center">🐐</div><span className="text-lg font-bold text-[#c8a96e]">GoatMart</span></div>
            {/* <p className="text-xs leading-relaxed text-gray-500 font-sans max-w-[220px]">India&apos;s most trusted premium livestock marketplace.</p> */}
            {/* <div className="mt-4 p-3 bg-[#1a1a1a] rounded-xl border border-[#2a2a2a]"><Link href="/seller-landing" className="text-xs text-[#c8a96e] font-sans font-semibold">🏪 Become a Seller → Apply Now</Link></div> */}
         </div>
          {Object.entries(LINKS).map(([title,links])=>(<div key={title}><div className="text-[10px] font-bold tracking-[2px] uppercase text-[#c8a96e] mb-4 font-sans">{title}</div>{links.map(l=>(<Link key={l.label} href={l.href} className="block text-xs text-gray-500 mb-2.5 font-sans hover:text-[#c8a96e] transition-colors">{l.label}</Link>))}</div>))}
        </div>
        <div className="flex flex-wrap items-center justify-between pt-5 border-t border-[#1f1f1f] gap-3">
          <p className="text-xs font-sans text-gray-600">© {new Date().getFullYear()} GoatMart. All rights reserved.</p>
          <p className="text-xs font-sans text-gray-700">Made with ❤️ for India&apos;s livestock community</p>
        </div>
      </div>
    </footer>
  );
}


