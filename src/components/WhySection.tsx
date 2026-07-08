// const F=[{icon:"🔬",title:"Health Certified",desc:"Every goat comes with verified health documents and vaccination records."},{icon:"🚚",title:"Pan-India Delivery",desc:"We ensure safe and reliable goat transportation to your city anywhere in India through trusted transport services."},{icon:"💬",title:"Live Chat Support",desc:"Chat directly with verified sellers before making any purchase."},{icon:"🔒",title:"Secure Payments",desc:"100% secure transactions via Razorpay — UPI, Cards, Net Banking."}];
// export default function WhySection(){return(<section style={{background:"linear-gradient(135deg,#1a0a00,#3d1f00)"}} className="py-14 px-5"><div className="max-w-[1280px] mx-auto"><div className="text-center mb-10"><h2 className="text-2xl sm:text-3xl font-bold text-white font-serif mb-2">Why Choose GoatMart?</h2><p className="text-white/50 text-sm font-sans"></p></div><div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{F.map(f=>(<div key={f.title} className="rounded-2xl p-5 border border-[rgba(200,169,110,0.18)] hover:-translate-y-1 transition-transform" style={{background:"rgba(255,255,255,0.06)"}}><div className="text-3xl mb-3">{f.icon}</div><h3 className="text-base font-bold text-white mb-2 font-serif">{f.title}</h3><p className="text-xs text-white/45 leading-relaxed font-sans">{f.desc}</p></div>))}</div></div></section>);}

const F=[{icon:"🔬",title:"Health Certified",desc:"Every goat comes with verified health documents and vaccination records."},{icon:"🚚",title:"Pan-India Delivery",desc:"We ensure safe and reliable goat transportation to your city anywhere in India through trusted transport services."},{icon:"💬",title:"Live Chat Support",desc:"Chat directly with verified sellers before making any purchase."},{icon:"🔒",title:"Secure Payments",desc:"100% secure transactions via Razorpay — UPI, Cards, Net Banking."}];

export default function WhySection(){
  return(
    <section style={{background:"linear-gradient(135deg,#1a0a00,#3d1f00)"}} className="py-14 px-5">
      <div className="max-w-[1280px] mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-white font-serif mb-2">Why Choose GoatMart?</h2>
          <p className="text-white/50 text-sm font-sans"></p>
        </div>
        
        {/* Badlao yahan kiya gaya hai: flex layout aur scroll enable kiya hai */}
        <div className="flex overflow-x-auto gap-4 pb-4 snap-x scrollbar-none lg:grid lg:grid-cols-4 lg:pb-0">
          {F.map(f=>(
            <div 
              key={f.title} 
              className="rounded-2xl p-5 border border-[rgba(200,169,110,0.18)] hover:-translate-y-1 transition-transform min-w-[260px] sm:min-w-[280px] lg:min-w-full snap-start" 
              style={{background:"rgba(255,255,255,0.06)"}}
            >
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="text-base font-bold text-white mb-2 font-serif">{f.title}</h3>
              <p className="text-xs text-white/45 leading-relaxed font-sans">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}