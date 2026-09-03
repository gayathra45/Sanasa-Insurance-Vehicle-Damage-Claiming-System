"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Navbar from "../../Components/Homepage/Navbar";
import Footer from "../../Components/Homepage/Footer";

const pageTranslations = {
  en: {
    contactUs: "Contact Us",
    headOffice: "Head Office",
    address: "No: 172, Elvitigala Mv, Colombo 8,\nSri Lanka",
    openHours: "Open Hours",
    hoursVal: "Monday - Friday\n8:30AM–5:15PM",
    hotline: "Hotline",
    phone1: "+94 112 003 000",
    phone2: "+94 112 003 000 - 24 Hours Hotline",
    location: "Location"
  },
  si: {
    contactUs: "සම්බන්ධ වන්න",
    headOffice: "ප්‍රධාන කාර්යාලය",
    address: "නො: 172, ඇල්විටිගල මාවත, කොළඹ 8,\nශ්‍රී ලංකාව",
    openHours: "වැඩ කරන වේලාවන්",
    hoursVal: "සඳුදා - සිකුරාදා\nපෙ.ව. 8:30 – ප.ව. 5:15",
    hotline: "ක්ෂණික ඇමතුම්",
    phone1: "+94 112 003 000",
    phone2: "+94 112 003 000 - 24 පැය ක්ෂණික ඇමතුම්",
    location: "පිහිටීම"
  },
  ta: {
    contactUs: "தொடர்பு கொள்ள",
    headOffice: "தலைமை அலுவலகம்",
    address: "எண்: 172, எல்விட்டிஹல மாவத்தை, கொழும்பு 8,\nஇலங்கை",
    openHours: "திறந்திருக்கும் நேரம்",
    hoursVal: "திங்கள் - வெள்ளி\nமு.ப. 8:30 – பி.ப. 5:15",
    hotline: "உதவி எண்",
    phone1: "+94 112 003 000",
    phone2: "+94 112 003 000 - 24 மணி நேர உதவி எண்",
    location: "இருப்பிடம்"
  }
};

export default function ContactUs() {
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
      
      {/* Banner Section */}
      <section className="relative w-full max-w-[1400px] h-32 md:h-40 lg:h-48 mb-12 mt-4">
         <div className="absolute top-0 left-0 w-[95%] md:w-[85%] h-full overflow-hidden rounded-r-[3rem] md:rounded-r-[5rem]">
            <Image 
               src="/contact_border.jpeg" 
               alt="Contact Banner" 
               fill 
               className="object-cover object-center" 
               priority
            />
            {/* Dark teal/blue overlay */}
            <div className="absolute inset-0 bg-[#004f6e]/70 mix-blend-multiply"></div>
            <div className="absolute inset-0 flex items-center px-10 md:px-20 lg:px-32">
               <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white tracking-wide">
                 {t.contactUs}
               </h1>
            </div>
         </div>
      </section>

      {/* Info Section */}
      <section className="max-w-6xl mx-auto w-full px-6 py-10 md:py-16 grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-0 relative z-10">
        
        {/* Head Office */}
        <div className="flex flex-col items-start md:px-10 group">
          <div className="w-16 h-16 rounded-full border-2 border-[#0284c7] bg-sky-50/50 text-[#0284c7] flex items-center justify-center mb-6 group-hover:bg-[#0284c7] group-hover:text-white transition-all duration-300 shadow-sm">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
            </svg>
          </div>
          <h3 className="font-bold text-gray-900 text-lg md:text-xl mb-3 group-hover:text-[#0284c7] transition-colors">{t.headOffice}</h3>
          <p className="text-gray-700 text-base md:text-[17px] leading-relaxed whitespace-pre-line">{t.address}</p>
        </div>

        {/* Open Hours */}
        <div className="flex flex-col items-start md:px-10 md:border-l md:border-gray-200 group">
          <div className="w-16 h-16 rounded-full border-2 border-[#0284c7] bg-sky-50/50 text-[#0284c7] flex items-center justify-center mb-6 group-hover:bg-[#0284c7] group-hover:text-white transition-all duration-300 shadow-sm">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <h3 className="font-bold text-gray-900 text-lg md:text-xl mb-3 group-hover:text-[#0284c7] transition-colors">{t.openHours}</h3>
          <p className="text-gray-700 text-base md:text-[17px] leading-relaxed whitespace-pre-line">{t.hoursVal}</p>
        </div>

        {/* Hotline */}
        <div className="flex flex-col items-start md:px-10 md:border-l md:border-gray-200 group">
          <div className="w-16 h-16 rounded-full border-2 border-[#0284c7] bg-sky-50/50 text-[#0284c7] flex items-center justify-center mb-6 group-hover:bg-[#0284c7] group-hover:text-white transition-all duration-300 shadow-sm">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.387a12.035 12.035 0 0 1-7.108-7.108c-.145-.44.02-.927.396-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25z" />
            </svg>
          </div>
          <h3 className="font-bold text-gray-900 text-lg md:text-xl mb-3 group-hover:text-[#0284c7] transition-colors">{t.hotline}</h3>

          <p className="text-gray-700 text-base md:text-[17px] leading-relaxed mb-1.5 font-medium">{t.phone1}</p>
          <p className="text-gray-700 text-base md:text-[17px] leading-relaxed">{t.phone2}</p>
        </div>

      </section>

      {/* Location Section */}
      <section className="relative w-full mt-16 md:mt-24 pt-12 md:pt-20">
         {/* Background image for the location section */}
         <div className="absolute inset-0 top-0 h-[400px] md:h-[450px] w-full overflow-hidden">
            <Image 
               src="/contact_location.png" 
               alt="Location Background" 
               fill 
               className="object-cover object-center" 
            />
            {/* Dark gradient overlay on the left to make "Location" text pop */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#1b3b55]/90 via-[#1b3b55]/40 to-transparent"></div>
            {/* White gradient overlay from bottom to fade out the background */}
            <div className="absolute inset-0 bg-gradient-to-t from-white via-white/50 to-transparent"></div>
         </div>
         
         <div className="relative max-w-6xl mx-auto px-6 z-10 flex flex-col">
            
            {/* Location Title */}
            <div className="flex justify-between items-start mb-6 md:mb-10">
               <h2 className="text-3xl md:text-4xl font-bold text-white drop-shadow-md md:pl-4">
                 {t.location}
               </h2>
            </div>

            <div className="flex flex-col md:flex-row gap-8 lg:gap-16 items-start">
               {/* Map iframe overlapping bottom */}
               <div className="w-full md:w-[60%] lg:w-[55%] -mb-12 md:-mb-24 z-20 md:pl-4">
                  <div className="relative w-full h-[250px] md:h-[350px] rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-2xl border-[6px] border-white bg-white">
                     <iframe 
                        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3961.2661808899647!2d79.87076!3d6.918!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ae259ab28a0b0f1%3A0x5f5b0b0b0b0b0b0b!2sSanasa%20General%20Insurance!5e0!3m2!1sen!2slk!4v1234567890"
                        width="100%" 
                        height="100%" 
                        style={{ border: 0 }} 
                        allowFullScreen={true} 
                        loading="lazy" 
                        referrerPolicy="no-referrer-when-downgrade"
                        className="absolute inset-0 w-full h-full"
                     ></iframe>
                  </div>
               </div>

               {/* Head Office text next to map */}
               <div className="w-full md:w-[40%] lg:w-[45%] mt-4 md:mt-32">
                  <h3 className="font-bold text-gray-800 text-sm md:text-base mb-2">{t.headOffice}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{t.address}</p>
               </div>
            </div>

         </div>
         {/* Spacer to prevent overlapping with footer due to negative margin */}
         <div className="h-12 md:h-24"></div>
      </section>

      <Footer />
    </div>
  );
}
