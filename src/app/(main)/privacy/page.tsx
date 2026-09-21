import Link from "next/link";
import {
  ArrowLeft,
  ShieldCheck,
  LockKeyhole,
  Database,
  Eye,
  UserCheck,
  FileCheck,
} from "lucide-react";

export const metadata = {
  title: "गोपनीयता नीति | GoatMart",
  description:
    "GoatMart आपकी व्यक्तिगत जानकारी की सुरक्षा और गोपनीयता को गंभीरता से लेता है। हमारी गोपनीयता नीति पढ़ें।",
};

const sections = [
  {
    icon: Database,
    title: "हम कौन-सी जानकारी एकत्र करते हैं?",
    body: "GoatMart का उपयोग करते समय हम आपकी आवश्यकता के अनुसार नाम, ईमेल, मोबाइल नंबर, खाते से जुड़ी जानकारी, खरीदारी से संबंधित विवरण और सेवा का उपयोग करते समय आवश्यक तकनीकी जानकारी एकत्र कर सकते हैं।",
  },
  {
    icon: Eye,
    title: "जानकारी का उपयोग कैसे किया जाता है?",
    body: "आपकी जानकारी का उपयोग आपके खाते को संचालित करने, खरीदारी और संबंधित सेवाएँ प्रदान करने, महत्वपूर्ण अपडेट भेजने, सहायता प्रदान करने, सुरक्षा बनाए रखने और GoatMart के अनुभव को बेहतर बनाने के लिए किया जाता है।",
  },
  {
    icon: ShieldCheck,
    title: "आपकी जानकारी की सुरक्षा",
    body: "हम आपकी व्यक्तिगत जानकारी को अनधिकृत पहुँच, परिवर्तन, दुरुपयोग या प्रकटीकरण से सुरक्षित रखने के लिए उचित तकनीकी और संगठनात्मक सुरक्षा उपाय अपनाने का प्रयास करते हैं।",
  },
  {
    icon: LockKeyhole,
    title: "भुगतान संबंधी जानकारी",
    body: "ऑनलाइन भुगतान के दौरान संवेदनशील भुगतान जानकारी संबंधित सुरक्षित भुगतान सेवा प्रदाता द्वारा संसाधित की जा सकती है। GoatMart आवश्यक भुगतान प्रक्रिया के बाहर संवेदनशील कार्ड जानकारी को जानबूझकर संग्रहीत नहीं करता।",
  },
  {
    icon: UserCheck,
    title: "आपके अधिकार",
    body: "आप अपने खाते से संबंधित उपलब्ध व्यक्तिगत जानकारी को देखने, उसमें सुधार करने या उचित परिस्थितियों में उसे हटाने का अनुरोध कर सकते हैं। किसी भी अनुरोध के लिए उपलब्ध सहायता माध्यमों का उपयोग करें।",
  },
  {
    icon: FileCheck,
    title: "जानकारी कितने समय तक रखी जाती है?",
    body: "आपकी जानकारी को उतने समय तक रखा जा सकता है जितना आपके खाते, सेवाओं, लेन-देन, सुरक्षा, विवाद समाधान या लागू कानूनी एवं नियामक आवश्यकताओं के लिए आवश्यक हो। आवश्यकता समाप्त होने पर जानकारी को हटाया या सुरक्षित तरीके से नष्ट किया जा सकता है।",
  },
];

export default function PrivacyPage() {
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
          गोपनीयता नीति
        </h1>

        <div className="w-10" />
      </div>

      {/* Hero */}
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#fffaf0] via-white to-[#f8f3e8] border border-[#eadfc9] p-7 sm:p-10 text-center shadow-sm">
        <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-[#c8a96e]/10" />
        <div className="absolute -bottom-20 -left-16 w-48 h-48 rounded-full bg-[#c8a96e]/10" />

        <div className="relative">
          <div className="mx-auto mb-5 w-16 h-16 rounded-2xl bg-white border border-[#eadfc9] shadow-sm flex items-center justify-center">
            <ShieldCheck size={29} className="text-[#c8a96e]" />
          </div>

          <p className="text-xs font-semibold tracking-[0.2em] text-[#b08d4f] uppercase mb-3">
            आपकी गोपनीयता, हमारी प्राथमिकता
          </p>

          <h2 className="text-3xl sm:text-4xl font-bold font-serif text-gray-900 mb-4">
            आपकी जानकारी की
            <span className="text-[#c8a96e]"> सुरक्षा</span>
          </h2>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-gray-600 leading-7">
            GoatMart आपकी व्यक्तिगत जानकारी की गोपनीयता और सुरक्षा को
            महत्वपूर्ण मानता है। यह नीति बताती है कि आपकी जानकारी को कैसे
            एकत्र, उपयोग और सुरक्षित किया जा सकता है।
          </p>

          <div className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#eadfc9] text-xs text-gray-500">
            <LockKeyhole size={13} className="text-[#c8a96e]" />
            अंतिम अपडेट: 2026
          </div>
        </div>
      </div>

      {/* Policy Sections */}
      <div className="mt-6 bg-white rounded-[2rem] border border-gray-100 p-6 sm:p-9 shadow-sm">
        <div className="space-y-1">
          {sections.map((section, index) => {
            const Icon = section.icon;

            return (
              <div
                key={section.title}
                className={`py-6 ${
                  index !== sections.length - 1
                    ? "border-b border-gray-100"
                    : ""
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-[#fff8e9] flex items-center justify-center flex-shrink-0">
                    <Icon size={20} className="text-[#c8a96e]" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[11px] font-bold text-[#c8a96e]">
                        {String(index + 1).padStart(2, "0")}
                      </span>

                      <h3 className="text-base sm:text-lg font-bold font-serif text-gray-900">
                        {section.title}
                      </h3>
                    </div>

                    <p className="text-sm text-gray-500 font-sans leading-7">
                      {section.body}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Privacy Promise */}
      <div className="mt-6 rounded-[2rem] bg-gray-900 p-7 sm:p-9 text-center text-white">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-4">
          <ShieldCheck size={24} className="text-[#d8b879]" />
        </div>

        <h3 className="text-xl sm:text-2xl font-bold font-serif mb-3">
          आपकी जानकारी, आपका भरोसा
        </h3>

        <p className="max-w-xl mx-auto text-sm text-gray-300 leading-6">
          GoatMart में हम आपकी जानकारी का जिम्मेदारी से उपयोग करने और उसे
          सुरक्षित रखने के लिए उचित कदम उठाने का प्रयास करते हैं।
        </p>
      </div>

      {/* Footer Note */}
      <div className="mt-6 text-center px-4">
        <p className="text-xs text-gray-400 leading-6">
          GoatMart का उपयोग जारी रखने से पहले इस नीति को ध्यानपूर्वक पढ़ने की
          सलाह दी जाती है। सेवाओं या नीतियों में महत्वपूर्ण बदलाव होने पर
          आवश्यकतानुसार इस पृष्ठ को अपडेट किया जा सकता है।
        </p>
      </div>
    </div>
  );
}
