import React from "react";
import Image from "next/image";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Call02Icon, Facebook01Icon, InstagramIcon, TiktokIcon, WhatsappIcon } from "@hugeicons/core-free-icons";

export default function PolicyHolderFooter() {
  return (
    <footer className="bg-[#102A43] text-white pt-12 pb-6 px-6 md:px-16 w-full">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center md:items-start gap-10">
        
        {/* Left Section - Logo */}
        <div className="flex-shrink-0 flex justify-center md:justify-start">
          <Link href="/Policy_Holder/Home">
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
            <Link href="/Policy_Holder/Home" className="hover:text-white text-slate-200 transition-colors duration-150 no-underline font-normal">
              Home
            </Link>
            <Link href="/Policy_Holder/My_claims" className="hover:text-white text-slate-200 transition-colors duration-150 no-underline font-normal">
              My Claims
            </Link>
            <Link href="/Policy_Holder/New_Claim" className="hover:text-white text-slate-200 transition-colors duration-150 no-underline font-normal">
              New Claims
            </Link>
            <Link href="/Policy_Holder/Documents" className="hover:text-white text-slate-200 transition-colors duration-150 no-underline font-normal">
              Documents
            </Link>
            <Link href="/Policy_Holder/Contact" className="hover:text-white text-slate-200 transition-colors duration-150 no-underline font-normal">
              Contact
            </Link>
          </div>

          {/* Column 2 */}
          <div className="flex flex-col gap-2.5 font-normal text-base">
            <Link href="/Policy_Holder/Notifications" className="hover:text-white text-slate-200 transition-colors duration-150 no-underline font-normal">
              Notifications
            </Link>
            <Link href="/Policy_Holder/MyVehicles" className="hover:text-white text-slate-200 transition-colors duration-150 no-underline font-normal">
              My Vehicles
            </Link>
            <Link href="/Policy_Holder/TrackClaims" className="hover:text-white text-slate-200 transition-colors duration-150 no-underline font-normal">
              Track Claims
            </Link>
            <Link href="/Policy_Holder/HelpCentre" className="hover:text-white text-slate-200 transition-colors duration-150 no-underline font-normal">
              Help Centre
            </Link>
            <Link href="/Policy_Holder/Profile" className="hover:text-white text-slate-200 transition-colors duration-150 no-underline font-normal">
              My Profile
            </Link>
          </div>
        </div>

        {/* Right Section - Contact & Socials */}
        <div className="flex flex-col items-center md:items-end gap-6 flex-shrink-0 w-full md:w-auto">
          {/* 24 Hours Contact */}
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

      {/* Copyright Bar */}
      <div className="max-w-7xl mx-auto text-center pt-6 mt-10 border-t border-white/15 text-[14px]">
        <p className="m-0 font-normal text-slate-300">
          © 2025 Sanasa General Insurance Co. LTD. All Rights Reserved.
        </p>
      </div>
    </footer>
  );
}
