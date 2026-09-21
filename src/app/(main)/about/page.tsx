import Link from "next/link";
import { ArrowLeft, ShieldCheck, HeartHandshake, BadgeCheck, Truck, Users, Sparkles } from "lucide-react";

export const metadata = {
  title: "हमारे बारे में | GoatMart",
  description:
    "GoatMart — भारत में गुणवत्तापूर्ण और विश्वसनीय पशुधन खरीद-बिक्री का आधुनिक डिजिटल मंच।",
};

const features = [
  {
    icon: BadgeCheck,
    title: "सत्यापित विक्रेता",
    body: "हमारा उद्देश्य खरीदारों को विश्वसनीय और सत्यापित विक्रेताओं से जोड़ना है, ताकि खरीदारी का अनुभव सुरक्षित और भरोसेमंद रहे।",
  },
  {
    icon: ShieldCheck,
    title: "पारदर्शी जानकारी",
    body: "पशु की नस्ल, उम्र, वजन, स्वास्थ्य और अन्य महत्वपूर्ण जानकारी को स्पष्ट रूप से उपलब्ध कराने पर हमारा विशेष ध्यान है।",
  },
  {
    icon: HeartHandshake,
    title: "भरोसे पर आधारित मंच",
    body: "GoatMart खरीदारों और विक्रेताओं के बीच सीधे और पारदर्शी संवाद को आसान बनाता है, जिससे बेहतर निर्णय लिया जा सके।",
  },
  {
    icon: Truck,
    title: "आसान खरीदारी अनुभव",
    body: "अपने पसंदीदा पशु को खोजने से लेकर विक्रेता से संपर्क करने तक, पूरी प्रक्रिया को सरल और सुविधाजनक बनाने का प्रयास।",
  },
];

export default function AboutPage() {
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
          हमारे बारे में
        </h1>

        <div className="w-10" />
      </div>

      {/* Hero */}
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#fffaf0] via-white to-[#f8f3e8] border border-[#eadfc9] p-7 sm:p-12 text-center shadow-sm">
        <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-[#c8a96e]/10" />
        <div className="absolute -bottom-20 -left-16 w-48 h-48 rounded-full bg-[#c8a96e]/10" />

        <div className="relative">
          <div className="mx-auto mb-5 w-20 h-20 rounded-3xl bg-white border border-[#eadfc9] shadow-sm flex items-center justify-center text-5xl">
            🐐
          </div>

          <p className="text-xs sm:text-sm font-semibold tracking-[0.2em] uppercase text-[#b08d4f] mb-3">
            स्वागत है GoatMart पर
          </p>

          <h2 className="text-3xl sm:text-4xl font-bold font-serif text-gray-900 mb-4">
            भारत का भरोसेमंद
            <span className="text-[#c8a96e]"> पशुधन बाज़ार</span>
          </h2>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-gray-600 leading-7">
            GoatMart एक आधुनिक डिजिटल मंच है, जो गुणवत्तापूर्ण पशुधन की
            खरीद-बिक्री को आसान, पारदर्शी और भरोसेमंद बनाने के उद्देश्य से
            बनाया गया है।
          </p>
        </div>
      </div>

      {/* Our Story */}
      <div className="mt-6 bg-white rounded-[2rem] border border-gray-100 p-7 sm:p-9 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-[#fff8e9] flex items-center justify-center">
            <Sparkles size={20} className="text-[#c8a96e]" />
          </div>

          <div>
            <p className="text-xs font-semibold text-[#b08d4f] uppercase tracking-wider">
              हमारी कहानी
            </p>
            <h3 className="text-xl font-bold font-serif text-gray-900">
              एक बेहतर पशुधन बाज़ार की ओर
            </h3>
          </div>
        </div>

        <p className="text-sm sm:text-base text-gray-600 leading-7">
          पशुधन खरीदना केवल एक लेन-देन नहीं, बल्कि एक महत्वपूर्ण निर्णय है।
          इसी सोच के साथ GoatMart को एक ऐसे मंच के रूप में विकसित किया गया है
          जहाँ खरीदार अपनी आवश्यकता के अनुसार पशु खोज सकें और विक्रेता अपने
          पशुधन को सही ग्राहकों तक पहुँचा सकें।
        </p>

        <p className="mt-4 text-sm sm:text-base text-gray-600 leading-7">
          हमारा प्रयास तकनीक और पारंपरिक पशुपालन के बीच एक मजबूत कड़ी बनाना है,
          ताकि पशुधन बाज़ार अधिक व्यवस्थित, पारदर्शी और सभी के लिए सुविधाजनक
          बन सके।
        </p>
      </div>

      {/* Mission */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-gray-900 rounded-[2rem] p-7 sm:p-8 text-white">
          <Users size={25} className="text-[#d8b879] mb-5" />

          <h3 className="text-xl font-bold font-serif mb-3">
            हमारा उद्देश्य
          </h3>

          <p className="text-sm text-gray-300 leading-7">
            खरीदारों और विश्वसनीय पशुधन विक्रेताओं को एक ही मंच पर जोड़ना और
            पशु खरीदने की प्रक्रिया को सरल, सुरक्षित और पारदर्शी बनाना।
          </p>
        </div>

        <div className="bg-[#fffaf0] border border-[#eadfc9] rounded-[2rem] p-7 sm:p-8">
          <HeartHandshake size={25} className="text-[#c8a96e] mb-5" />

          <h3 className="text-xl font-bold font-serif text-gray-900 mb-3">
            हमारा विश्वास
          </h3>

          <p className="text-sm text-gray-600 leading-7">
            सही जानकारी, स्पष्ट संवाद और भरोसेमंद लेन-देन एक बेहतर पशुधन
            बाज़ार की नींव हैं। GoatMart इन्हीं मूल्यों को केंद्र में रखकर
            बनाया गया है।
          </p>
        </div>
      </div>

      {/* Why GoatMart */}
      <div className="mt-6 bg-white rounded-[2rem] border border-gray-100 p-7 sm:p-9 shadow-sm">
        <div className="text-center mb-8">
          <p className="text-xs font-semibold text-[#b08d4f] uppercase tracking-wider mb-2">
            GoatMart क्यों?
          </p>

          <h3 className="text-2xl font-bold font-serif text-gray-900">
            खरीदारी में भरोसा और सुविधा
          </h3>

          <p className="mt-2 text-sm text-gray-500">
            एक बेहतर पशुधन खरीद-बिक्री अनुभव के लिए आवश्यक सुविधाएँ
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <div
                key={feature.title}
                className="group rounded-2xl border border-gray-100 p-5 hover:border-[#eadfc9] hover:bg-[#fffdf8] transition-all"
              >
                <div className="w-11 h-11 rounded-xl bg-[#fff8e9] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <Icon size={20} className="text-[#c8a96e]" />
                </div>

                <h4 className="text-base font-bold font-serif text-gray-900 mb-2">
                  {feature.title}
                </h4>

                <p className="text-sm text-gray-500 leading-6">
                  {feature.body}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Closing */}
      <div className="mt-6 rounded-[2rem] border border-[#eadfc9] bg-gradient-to-r from-[#fffaf0] to-white p-7 sm:p-9 text-center">
        <div className="text-3xl mb-3">🐐</div>

        <h3 className="text-xl sm:text-2xl font-bold font-serif text-gray-900">
          GoatMart — जहाँ भरोसा मिलता है, सही पशुधन मिलता है।
        </h3>

        <p className="mt-3 text-sm text-gray-500 max-w-xl mx-auto leading-6">
          हमारा लक्ष्य एक ऐसा डिजिटल पशुधन समुदाय बनाना है जहाँ हर खरीदार
          बेहतर जानकारी के साथ निर्णय ले सके और हर विक्रेता अपने पशुधन को
          सही लोगों तक पहुँचा सके।
        </p>
      </div>
    </div>
  );
}
