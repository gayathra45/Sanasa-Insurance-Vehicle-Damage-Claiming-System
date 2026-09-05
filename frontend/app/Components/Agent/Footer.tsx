import React from "react";
import Image from "next/image";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Call02Icon, Facebook01Icon, InstagramIcon, TiktokIcon, WhatsappIcon } from "@hugeicons/core-free-icons";

export default function Footer() {
  return (
    <footer className="bg-[#102A43] text-white pt-12 pb-6 px-6 md:px-16 w-full">
      <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row justify-between gap-8 md:gap-4">
        
        {/* Left Column - Logo */}
        <div className="flex-shrink-0 flex justify-start items-start">
          <Link href="/Agent/Home">
            <Image
              src="/footer_logo.svg"
              alt="Sanasa General Insurance"
              width={150}
              height={60}
              className="h-auto max-w-[170px] object-contain"
              priority
            />
          </Link>
        </div>

        {/* Center Navigation Column 1 */}
        <div className="flex flex-col gap-3 font-semibold text-lg md:pl-8">
          <Link href="/Agent/Home" className="hover:text-white/80 transition-colors duration-150 no-underline text-white">
            Home
          </Link>
          <Link href="/Agent/MyClaims" className="hover:text-white/80 transition-colors duration-150 no-underline text-white">
            My Claims
          </Link>
          <Link href="/Agent/MyActivity" className="hover:text-white/80 transition-colors duration-150 no-underline text-white">
            My Activity
          </Link>
          <Link href="/Agent/Contact" className="hover:text-white/80 transition-colors duration-150 no-underline text-white">
            Contact
          </Link>
        </div>

        {/* Center Navigation Column 2 */}
        <div className="flex flex-col gap-3 font-semibold text-lg md:pl-8">
          <Link href="/Agent/Notifications" className="hover:text-white/80 transition-colors duration-150 no-underline text-white">
            Notifications
          </Link>
          <Link href="/Login" className="hover:text-white/80 transition-colors duration-150 no-underline text-white">
            My Profile
          </Link>
        </div>

        {/* Right Section - Helpline & Social Icons */}
        <div className="flex-1 flex flex-col md:flex-row justify-between items-start md:items-start gap-6">
          {/* 24 Hours Helpline */}
          <div className="flex items-center gap-2.5 text-lg font-bold md:ml-auto">
            <HugeiconsIcon icon={Call02Icon} className="w-6 h-6 text-white" strokeWidth={2} />
            <span>24 Hours : 0725 575 575</span>
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
      <div className="max-w-[1200px] mx-auto text-center pt-6 mt-10 border-t border-white/10 text-sm font-semibold tracking-wide">
        <p className="m-0">
          © 2025 Sanasa General Insurance Co. LTD. All Rights Reserved.
        </p>
      </div>
    </footer>
  );
}
