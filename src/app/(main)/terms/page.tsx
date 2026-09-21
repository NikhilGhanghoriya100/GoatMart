import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  ShieldCheck,
  UserCheck,
  Store,
  CreditCard,
  RefreshCcw,
  Scale,
} from "lucide-react";

export const metadata = {
  title: "नियम एवं शर्तें | GoatMart",
  description:
    "GoatMart के उपयोग, खरीदारों, विक्रेताओं, भुगतान और अन्य सेवाओं से संबंधित नियम एवं शर्तें।",
};

const sections = [
  {
    icon: UserCheck,
    title: "स्वीकृति और उपयोग",
    body: "GoatMart का उपयोग करके आप इन नियमों एवं शर्तों और हमारी गोपनीयता नीति से सहमत होते हैं। यदि आप इन शर्तों से सहमत नहीं हैं, तो कृपया हमारी सेवाओं का उपयोग न करें।",
  },
  {
    icon: Store,
    title: "GoatMart एक मार्केटप्लेस है",
    body: "GoatMart खरीदारों और पशुधन विक्रेताओं के बीच संपर्क स्थापित करने वाला डिजिटल मंच है। वेबसाइट पर उपलब्ध पशुधन की वास्तविक बिक्री, गुणवत्ता, स्वास्थ्य या स्वामित्व से संबंधित जानकारी विक्रेता द्वारा प्रदान की जा सकती है। खरीदारों को खरीदारी से पहले उपलब्ध जानकारी की उचित जाँच करने की सलाह दी जाती है।",
  },
  {
    icon: ShieldCheck,
    title: "खरीदारों के लिए नियम",
    body: "खरीदारों को किसी भी पशु को खरीदने से पहले उसकी नस्ल, उम्र, वजन, स्वास्थ्य संबंधी जानकारी, उपलब्ध प्रमाण-पत्र और अन्य महत्वपूर्ण विवरणों की जाँच करनी चाहिए। किसी भी खरीदारी का निर्णय उपलब्ध जानकारी और खरीदार की अपनी जाँच के आधार पर लिया जाना चाहिए।",
  },
  {
    icon: Store,
    title: "विक्रेताओं के लिए नियम",
    body: "विक्रेताओं को अपने पशुधन से संबंधित जानकारी सही, स्पष्ट और वर्तमान रखनी चाहिए। किसी भी पशु की तस्वीर, नस्ल, उम्र, वजन, स्वास्थ्य या अन्य विवरण को भ्रामक तरीके से प्रस्तुत नहीं किया जाना चाहिए। आवश्यक होने पर संबंधित प्रमाण-पत्र या दस्तावेज़ वास्तविक और वैध होने चाहिए।",
  },
  {
    icon: CreditCard,
    title: "भुगतान और लेन-देन",
    body: "भुगतान से संबंधित प्रक्रिया GoatMart पर उपलब्ध विकल्पों और लागू नियमों के अनुसार पूरी की जाएगी। किसी भी भुगतान से पहले खरीदार को ऑर्डर, पशु, कीमत और संबंधित शर्तों की जानकारी ध्यानपूर्वक जाँचनी चाहिए।",
  },
  {
    icon: RefreshCcw,
    title: "रद्दीकरण और रिफंड",
    body: "ऑर्डर रद्द करने, रिफंड या किसी लेन-देन से संबंधित समाधान उपलब्ध होने पर वह संबंधित ऑर्डर की शर्तों, लागू नीतियों और परिस्थितियों के अनुसार निर्धारित किया जाएगा। रिफंड की पात्रता और प्रक्रिया लेन-देन के प्रकार के आधार पर अलग हो सकती है।",
  },
  {
    icon: Scale,
    title: "जिम्मेदारी और विवाद",
    body: "GoatMart का उद्देश्य खरीदारों और विक्रेताओं के बीच एक सुरक्षित एवं पारदर्शी डिजिटल अनुभव प्रदान करना है। किसी भी विवाद की स्थिति में संबंधित पक्षों द्वारा उपलब्ध जानकारी, लेन-देन के रिकॉर्ड और लागू कानूनों के अनुसार समाधान का प्रयास किया जाएगा।",
  },
];

export default function TermsPage() {
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
          नियम एवं शर्तें
        </h1>

        <div className="w-10" />
      </div>

      {/* Hero */}
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#fffaf0] via-white to-[#f8f3e8] border border-[#eadfc9] p-7 sm:p-10 text-center shadow-sm">
        <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-[#c8a96e]/10" />
        <div className="absolute -bottom-20 -left-16 w-48 h-48 rounded-full bg-[#c8a96e]/10" />

        <div className="relative">
          <div className="mx-auto mb-5 w-16 h-16 rounded-2xl bg-white border border-[#eadfc9] shadow-sm flex items-center justify-center">
            <FileText size={28} className="text-[#c8a96e]" />
          </div>

          <p className="text-xs font-semibold tracking-[0.2em] text-[#b08d4f] uppercase mb-3">
            GoatMart के नियम
          </p>

          <h2 className="text-3xl sm:text-4xl font-bold font-serif text-gray-900 mb-4">
            नियम एवं
            <span className="text-[#c8a96e]"> शर्तें</span>
          </h2>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-gray-600 leading-7">
            GoatMart का उपयोग करने से पहले कृपया इन नियमों एवं शर्तों को
            ध्यानपूर्वक पढ़ें। ये शर्तें हमारे प्लेटफ़ॉर्म के उपयोग और
            खरीदार-विक्रेता गतिविधियों से संबंधित सामान्य नियम बताती हैं।
          </p>

          <div className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#eadfc9] text-xs text-gray-500">
            <FileText size={13} className="text-[#c8a96e]" />
            अंतिम अपडेट: 2026
          </div>
        </div>
      </div>

      {/* Terms Sections */}
      <div className="mt-6 bg-white rounded-[2rem] border border-gray-100 p-6 sm:p-9 shadow-sm">
        <div>
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

      {/* Important Notice */}
      <div className="mt-6 rounded-[2rem] bg-gray-900 p-7 sm:p-9 text-white">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={21} className="text-[#d8b879]" />
          </div>

          <div>
            <h3 className="text-lg font-bold font-serif mb-2">
              महत्वपूर्ण सूचना
            </h3>

            <p className="text-sm text-gray-300 leading-6">
              GoatMart पर उपलब्ध जानकारी में किसी भी महत्वपूर्ण तथ्य की पुष्टि
              करने की जिम्मेदारी संबंधित खरीदार या विक्रेता की हो सकती है।
              किसी भी खरीदारी या लेन-देन से पहले उपलब्ध विवरण और लागू शर्तों
              को ध्यानपूर्वक पढ़ें।
            </p>
          </div>
        </div>
      </div>

      {/* Closing */}
      <div className="mt-6 text-center px-4">
        <p className="text-xs sm:text-sm text-gray-400 leading-6">
          GoatMart समय-समय पर अपनी सेवाओं, सुविधाओं या नीतियों में बदलाव कर
          सकता है। आवश्यकतानुसार इन नियमों एवं शर्तों को भी अपडेट किया जा
          सकता है।
        </p>
      </div>
    </div>
  );
}
