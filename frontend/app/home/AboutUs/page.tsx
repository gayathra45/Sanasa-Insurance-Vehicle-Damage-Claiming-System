"use client";

import React, { useState, useEffect } from "react";
import Footer from "@/app/Components/Homepage/Footer";
import Navbar from "@/app/Components/Homepage/Navbar";
import Image from "next/image";

const pageTranslations = {
  en: {
    aboutUs: "About Us",
    founder: "Founder",
    founderTitle: "Dr. P.A. Kiriwandeniya",
    founderDesc: "Dr. Kiriwandeniya the Chairman of Sanasa Movement is an innovative thinker and the founding member of co-operative Movement of Sri Lanka. Dr. Kiriwandeniya graduated from the University of Sri Jayawardanapura in 1965 and was awarded with a Doctorate from the University of Ruhuna for the yeoman services rendered by him to uplift the cooperative Movement in Sri Lanka. Dr. Kiriwandeniya is a recipient of the Vishwaprasadani Presidential Award in 1996, one of Sri Lanka's highest and most prestigious national honors.",
    companyProfile: "Company Profile",
    profileDesc: "Sanasa Motor Vehicle Insurance, offered by SANASA Insurance Company Limited, provides reliable and affordable coverage tailored to the needs of vehicle owners across Sri Lanka. The policy typically includes protection against accidental damage, theft, and third-party liabilities, ensuring financial security in unexpected situations. Known for its customer-friendly service and strong community-based approach, SANASA Insurance focuses on quick claim settlements and flexible premium options. This makes it a popular choice among individuals seeking dependable insurance solutions with a focus on trust, accessibility, and value for money."
  },
  si: {
    aboutUs: "අප ගැන",
    founder: "නිර්මාතෘ",
    founderTitle: "ආචාර්ය පී.ඒ. කිරිවන්දෙනිය",
    founderDesc: "සනස ව්‍යාපාරයේ සභාපති ආචාර්ය කිරිවන්දෙනිය මහතා ශ්‍රී ලංකා සමුපකාර ව්‍යාපාරයේ නිර්මාතෘවරයෙකු සහ නවෝත්පාදන චින්තකයෙකි. ආචාර්ය කිරිවන්දෙනිය මහතා 1965 වසරේදී ශ්‍රී ජයවර්ධනපුර විශ්වවිද්‍යාලයෙන් උපාධිය ලබා ඇති අතර, ශ්‍රී ලංකාවේ සමුපකාර ව්‍යාපාරය නංවාලීම සඳහා ඔහු කළ සේවය වෙනුවෙන් රුහුණ විශ්වවිද්‍යාලයෙන් ආචාර්ය උපාධියක් පිරිනමන ලදී. ආචාර්ය කිරිවන්දෙනිය මහතා 1996 වසරේදී ශ්‍රී ලංකාවේ ඉහළම සහ කීර්තිමත් ජාතික සම්මානයක් වන විශ්වප්‍රසාදිනී ජනාධිපති සම්මානයෙන් පිදුම් ලැබීය.",
    companyProfile: "සමාගම් පැතිකඩ",
    profileDesc: "සනස රක්‍ෂණ සමාගම (SANASA Insurance Company Limited) මඟින් පිරිනමනු ලබන සනස මෝටර් රථ රක්‍ෂණය, ශ්‍රී ලංකාව පුරා සිටින වාහන හිමියන්ගේ අවශ්‍යතාවලට සරිලන පරිදි විශ්වාසදායක සහ දැරිය හැකි ආවරණයක් සපයයි. අනපේක්ෂිත අවස්ථාවන්හිදී මූල්‍ය සුරක්ෂිතභාවය සහතික කරමින්, මෙම රක්ෂණ ප්‍රතිපත්තිය සාමාන්‍යයෙන් හදිසි අනතුරු හානි, සොරකම් සහ තෙවන පාර්ශවීය වගකීම්වලට එරෙහිව ආරක්ෂාව ඇතුළත් වේ. පාරිභෝගික හිතකාමී සේවාව සහ ශක්තිමත් ප්‍රජා මූලික ප්‍රවේශය සඳහා ප්‍රසිද්ධ සනස රක්‍ෂණය, ඉක්මන් හිමිකම් පියවීම් සහ නම්‍යශීලී වාරික විකල්ප කෙරෙහි අවධානය යොමු කරයි. මෙය විශ්වාසය, ප්‍රවේශ්‍යතාව සහ මුදලට සරිලන වටිනාකම කෙරෙහි අවධානය යොමු කරමින් විශ්වාසදායක රක්ෂණ විසඳුම් අපේක්ෂා කරන පුද්ගලයින් අතර ජනප්‍රිය තේරීමක් කරයි."
  },
  ta: {
    aboutUs: "எங்களைப் பற்றி",
    founder: "நிறுவனர்",
    founderTitle: "டாக்டர் பி.ஏ. கிரிவந்தெனிய",
    founderDesc: "சனச இயக்கத்தின் தலைவரான டாக்டர் கிரிவந்தெனிய, இலங்கையின் கூட்டுறவு இயக்கத்தின் ஸ்தாபக உறுப்பினராகவும் புதுமையான சிந்தனையாளராகவும் விளங்குகிறார். டாக்டர் கிரிவந்தெனிய 1965 இல் ஸ்ரீ ஜயவர்தனபுர பல்கலைக்கழகத்தில் பட்டம் பெற்றார் மற்றும் இலங்கையில் கூட்டுறவு இயக்கத்தை மேம்படுத்துவதற்காக அவர் ஆற்றிய சேவைகளுக்காக ருஹுணு பல்கலைக்கழகத்தால் முனைவர் பட்டம் வழங்கப்பட்டது. டாக்டர் கிரிவந்தெனிய 1996 ஆம் ஆண்டில் இலங்கையின் மிக உயர்ந்த மற்றும் மதிப்புமிக்க தேசிய கௌரவங்களில் ஒன்றான விஸ்வபிரசாதினி ஜனாதிபதி விருதைப் பெற்றவர் ஆவார்.",
    companyProfile: "நிறுவனத்தின் விவரக்குறிப்பு",
    profileDesc: "சனச காப்பீட்டு நிறுவனத்தால் வழங்கப்படும் சனச மோட்டார் வாகன காப்பீடு, இலங்கை முழுவதிலும் உள்ள வாகன உரிமையாளர்களின் தேவைகளுக்கு ஏற்ப நம்பகமான மற்றும் மலிவான காப்பீட்டை வழங்குகிறது. பாலிசி பொதுவாக எதிர்பாராத சூழ்நிலைகளில் நிதி பாதுகாப்பை உறுதி செய்கிறது, தற்செயலான சேதம், திருட்டு மற்றும் மூன்றாம் தரப்பு பொறுப்புகளுக்கு எதிரான பாதுகாப்பை உள்ளடக்கியது. அதன் வாடிக்கையாளர் நட்பு சேவை மற்றும் வலுவான சமூகம் சார்ந்த அணுகுமுறைக்கு பெயர் பெற்ற சனச காப்பீடு, விரைவான கோரிக்கை தீர்வுகள் மற்றும் நெகிழ்வான பிரீமியம் விருப்பங்களில் கவனம் செலுத்துகிறது. இது நம்பிக்கை, அணுகல் மற்றும் பணத்திற்கான மதிப்பு ஆகியவற்றில் கவனம் செலுத்தும் நம்பகமான காப்பீட்டு தீர்வுகளைத் தேடும் தனிநபர்களிடையே பிரபலமான தேர்வாக அமைகிறது."
  }
};

export default function About() {
  const [lang, setLang] = useState<"en" | "si" | "ta">("en");

  // Load language from localStorage on mount
  useEffect(() => {
    const savedLang = localStorage.getItem("language") as "en" | "si" | "ta";
    if (savedLang && ["en", "si", "ta"].includes(savedLang)) {
      setLang(savedLang);
    }
  }, []);

  // Listen to language change events from navbar
  useEffect(() => {
    const handleLangChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setLang(customEvent.detail);
      }
    };
    window.addEventListener("language-changed", handleLangChange);
    return () => window.removeEventListener("language-changed", handleLangChange);
  }, []);

  const t = pageTranslations[lang];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      <section className="relative w-full max-w-[1400px] h-32 md:h-40 lg:h-48 mb-12 mt-4">
        <div className="absolute top-0 left-0 w-[95%] md:w-[85%] h-full overflow-hidden rounded-r-[3rem] md:rounded-r-[5rem]">
          <Image
            src="/about_header.jpg"
            alt="About Banner"
            fill
            className="object-cover object-center"
            priority
          />
          {/* Dark teal/blue overlay */}
          <div className="absolute inset-0 bg-[#004f6e]/70 mix-blend-multiply"></div>
          <div className="absolute inset-0 flex items-center px-10 md:px-20 lg:px-32">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white tracking-wide">
              {t.aboutUs}
            </h1>
          </div>
        </div>
      </section>

      {/* Founder Section */}
      <section className="w-full flex flex-col md:flex-row items-center justify-between py-12 md:py-20 px-6 md:px-16 gap-10 max-w-6xl mx-auto">
        {/* Left Side - Content */}
        <div className="flex-1 flex flex-col items-start">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-6 leading-tight">
            {t.founder}
          </h2>
          <div className="space-y-4 text-base text-gray-700 leading-relaxed">
            <h3 className="font-bold text-gray-900 text-lg">
              {t.founderTitle}
            </h3>
            <p>
              {t.founderDesc}
            </p>
          </div>
        </div>

        {/* Right Side - Image */}
        <div className="flex-1 flex justify-center items-center">
          <Image
            src="/about_1.jpg"
            alt="Founder Dr. P.A. Kiriwandeniya"
            width={350}
            height={400}
            className="object-contain rounded-lg shadow-lg"
            priority
          />
        </div>
      </section>

      {/* Company Profile Section */}
      <section className="w-full py-12 md:py-20 px-6 md:px-16 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-8 leading-tight">
            {t.companyProfile}
          </h2>
          <p className="text-base text-gray-700 leading-relaxed">
            {t.profileDesc}
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}