import React from "react";
import Image from "next/image";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Call02Icon, Facebook01Icon, InstagramIcon, TiktokIcon, WhatsappIcon } from "@hugeicons/core-free-icons";

export default function Footer() {
  return (
    <footer className="bg-[#102A43] text-white pt-12 pb-6 px-6 md:px-16 w-full">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center md:items-start gap-10">
        
        {/* Left Column - Logo */}
        <div className="flex-shrink-0 flex justify-center md:justify-start">
          <Link href="/Agent/Dashboard">
            <Image
              src="/footer_logo.svg"
              alt="Sanasa General Insurance"
              width={130}
              height={52}
              className="h-auto max-w-[150px] object-contain"
              priority
            />
          </Link>
        </div>

        {/* Center Sections - Two Navigation Columns */}
        <div className="flex flex-col sm:flex-row gap-12 md:gap-40 justify-center md:justify-center flex-1 w-full text-center sm:text-left">
          {/* Column 1 */}
          <div className="flex flex-col gap-2.5 font-normal text-base">
            <Link href="/Agent/Dashboard" className="hover:text-white text-slate-200 transition-colors duration-150 no-underline font-normal">
              Home
            </Link>
            <Link href="/Agent/MyClaims" className="hover:text-white text-slate-200 transition-colors duration-150 no-underline font-normal">
              My Claims
            </Link>
            <Link href="/Agent/MyActivity" className="hover:text-white text-slate-200 transition-colors duration-150 no-underline font-normal">
              My Activity
            </Link>
            <Link href="/Agent/Documents" className="hover:text-white text-slate-200 transition-colors duration-150 no-underline font-normal">
              Documents
            </Link>
            <Link href="/Agent/Contact" className="hover:text-white text-slate-200 transition-colors duration-150 no-underline font-normal">
              Contact
            </Link>
          </div>

          {/* Column 2 */}
          <div className="flex flex-col gap-2.5 font-normal text-base">
            <Link href="/Agent/Notifications" className="hover:text-white text-slate-200 transition-colors duration-150 no-underline font-normal">
              Notifications
            </Link>
            <Link href="/Agent/Profile" className="hover:text-white text-slate-200 transition-colors duration-150 no-underline font-normal">
              My Profile
            </Link>
            <Link href="/Agent/Contact" className="hover:text-white text-slate-200 transition-colors duration-150 no-underline font-normal">
              Agent Support
            </Link>
            <Link href="/Agent/Contact" className="hover:text-white text-slate-200 transition-colors duration-150 no-underline font-normal">
              Branch Network
            </Link>
          </div>
        </div>

        {/* Right Section - Helpline & Social Icons */}
        <div className="flex flex-col items-center md:items-end gap-6 flex-shrink-0 w-full md:w-auto">
          {/* 24 Hours Helpline */}
          <div className="flex items-center gap-3">
            <HugeiconsIcon icon={Call02Icon} className="w-6 h-6 text-white" strokeWidth={2} />
            <span className="font-medium text-base md:text-lg">
              24 Hours : 0725 575 575
            </span>
          </div>

          <div className="flex flex-row gap-3 md:gap-4 items-center justify-center md:justify-end">
            {/* Facebook */}
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="w-10 h-10 rounded-full bg-white/15 hover:bg-white text-white hover:text-[#102A43] flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-sm"
            >
              <HugeiconsIcon icon={Facebook01Icon} className="w-5 h-5" strokeWidth={2} />
            </a>

            {/* Instagram */}
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="w-10 h-10 rounded-full bg-white/15 hover:bg-white text-white hover:text-[#102A43] flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-sm"
            >
              <HugeiconsIcon icon={InstagramIcon} className="w-5 h-5" strokeWidth={2} />
            </a>

            {/* TikTok */}
            <a
              href="https://tiktok.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="TikTok"
              className="w-10 h-10 rounded-full bg-white/15 hover:bg-white text-white hover:text-[#102A43] flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-sm"
            >
              <HugeiconsIcon icon={TiktokIcon} className="w-5 h-5" strokeWidth={2} />
            </a>

            {/* WhatsApp */}
            <a
              href="https://whatsapp.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
              className="w-10 h-10 rounded-full bg-white/15 hover:bg-white text-white hover:text-[#102A43] flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-sm"
            >
              <HugeiconsIcon icon={WhatsappIcon} className="w-5 h-5" strokeWidth={2} />
            </a>
          </div>
        </div>

      </div>

      {/* Copyright Notice */}
      <div className="max-w-7xl mx-auto border-t border-white/10 mt-8 pt-6 text-center text-xs text-slate-400 font-normal">
        © {new Date().getFullYear()} Sanasa General Insurance Co. LTD. All Rights Reserved.
      </div>
    </footer>
  );
}
