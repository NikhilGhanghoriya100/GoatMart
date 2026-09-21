
import Link from "next/link";
import {
  ArrowLeft,
  MessageCircle,
  ShoppingBag,
  Store,
  HelpCircle,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

export const metadata = {
  title: "संपर्क करें | GoatMart",
  description:
    "GoatMart की सहायता टीम से संपर्क करें और खरीदारी, विक्रेता या पशुधन से संबंधित सहायता प्राप्त करें।",
};

const supportOptions = [
  {
    icon: ShoppingBag,
    title: "खरीदारी से जुड़ी सहायता",
    body: "पशु की जानकारी, उपलब्धता या खरीदारी से संबंधित किसी भी सवाल के लिए सहायता प्राप्त करें।",
    href: "/chat",
  },
  {
    icon: Store,
    title: "विक्रेता सहायता",
    body: "अपने पशुधन को सूचीबद्ध करने, बिक्री या विक्रेता से जुड़ी जानकारी के लिए सहायता लें।",
    href: "/chat",
  },
  {
    icon: ShieldCheck,
    title: "सुरक्षा और भरोसा",
    body: "किसी विक्रेता, लिस्टिंग या लेन-देन को लेकर कोई चिंता हो तो हमारी सहायता सुविधा का उपयोग करें।",
    href: "/chat",
  },
];

export default function ContactPage() {
  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 sm:py-12 overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link
          href="/"
          className="w-10 h-10 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:border-[#c8a96e] hover:bg-[#fffaf0] transition-all"
        >
          <ArrowLeft size={17} />
        </Link>

        <h1 className="flex-1 text-center text-xl sm:text-2xl font-bold font-serif text-gray-900">
          संपर्क करें
        </h1>

        <div className="w-10" />
      </div>

      {/* Hero */}
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#fffaf0] via-white to-[#f8f3e8] border border-[#eadfc9] p-7 sm:p-11 text-center shadow-sm">
        <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-[#c8a96e]/10" />
        <div className="absolute -bottom-20 -left-16 w-48 h-48 rounded-full bg-[#c8a96e]/10" />

        <div className="relative">
          <div className="mx-auto mb-5 w-16 h-16 rounded-2xl bg-white border border-[#eadfc9] shadow-sm flex items-center justify-center">
            <MessageCircle size={28} className="text-[#c8a96e]" />
          </div>

          <p className="text-xs font-semibold tracking-[0.2em] text-[#b08d4f] uppercase mb-3">
            हम आपकी सहायता के लिए यहाँ हैं
          </p>

          <h2 className="text-3xl sm:text-4xl font-bold font-serif text-gray-900 mb-4">
            हमसे <span className="text-[#c8a96e]">संपर्क करें</span>
          </h2>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-gray-600 leading-7">
            GoatMart से जुड़ी किसी भी जानकारी, खरीदारी, विक्रेता या पशुधन
            संबंधी सहायता के लिए हमारी सहायता सुविधा का उपयोग करें।
          </p>
        </div>
      </div>

      {/* Quick Support */}
      <div className="mt-6 bg-white rounded-[2rem] border border-gray-100 p-7 sm:p-9 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-[#fff8e9] flex items-center justify-center">
            <HelpCircle size={21} className="text-[#c8a96e]" />
          </div>

          <div>
            <p className="text-xs font-semibold text-[#b08d4f] uppercase tracking-wider">
              सहायता केंद्र
            </p>

            <h3 className="text-xl font-bold font-serif text-gray-900">
              आपको किस चीज़ में सहायता चाहिए?
            </h3>
          </div>
        </div>

        <div className="space-y-3">
          {supportOptions.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.title}
                href={item.href}
                className="group flex items-center gap-4 p-4 sm:p-5 rounded-2xl border border-gray-100 bg-[#faf8f4] hover:border-[#eadfc9] hover:bg-[#fffaf0] transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-white border border-gray-100 flex items-center justify-center flex-shrink-0">
                  <Icon size={21} className="text-[#c8a96e]" />
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-bold font-serif text-sm sm:text-base text-gray-900">
                    {item.title}
                  </h4>

                  <p className="text-xs sm:text-sm text-gray-500 leading-5 mt-1">
                    {item.body}
                  </p>
                </div>

                <ArrowRight
                  size={18}
                  className="text-gray-300 group-hover:text-[#c8a96e] group-hover:translate-x-1 transition-all flex-shrink-0"
                />
              </Link>
            );
          })}
        </div>
      </div>

      {/* Live Chat CTA */}
      <div className="mt-6 relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#c8a96e] to-[#8b5e2a] p-7 sm:p-10 text-white text-center">
        <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full bg-white/10" />
        <div className="absolute -bottom-24 -left-20 w-56 h-56 rounded-full bg-black/10" />

        <div className="relative">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center mb-5">
            <MessageCircle size={26} />
          </div>

          <h3 className="text-2xl font-bold font-serif mb-3">
            तुरंत सहायता चाहिए?
          </h3>

          <p className="max-w-lg mx-auto text-sm text-white/80 leading-6 mb-6">
            हमारे लाइव चैट के माध्यम से अपनी समस्या या सवाल साझा करें और
            उपलब्ध सहायता विकल्पों का उपयोग करें।
          </p>

          <Link
            href="/chat"
            className="inline-flex items-center gap-2 bg-white text-[#8b5e2a] font-bold text-sm px-6 py-3 rounded-full hover:scale-[1.02] hover:shadow-lg transition-all"
          >
            लाइव चैट खोलें
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      {/* Bottom Note */}
      <div className="mt-6 text-center px-4">
        <p className="text-xs sm:text-sm text-gray-400 leading-6">
          GoatMart का उद्देश्य खरीदारों और विक्रेताओं के बीच एक भरोसेमंद,
          पारदर्शी और सुविधाजनक अनुभव प्रदान करना है।
        </p>
      </div>
    </div>
  );
}
