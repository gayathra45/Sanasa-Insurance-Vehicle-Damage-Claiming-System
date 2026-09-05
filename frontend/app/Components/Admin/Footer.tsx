"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { HugeiconsIcon } from "@hugeicons/react";
import { Call02Icon, Facebook01Icon, InstagramIcon, TiktokIcon, WhatsappIcon } from "@hugeicons/core-free-icons";

export default function AdminFooter() {
  return (
    <footer className="bg-[#102A43] w-full text-white py-12 px-6 md:px-16 select-none relative z-10">
      <div className="max-w-7xl mx-auto flex flex-col gap-10">
        
        {/* Top Section */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
          
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center md:items-start flex-col">
            <div className="relative w-44 h-20">
              <Image
                src="/footer_logo.svg"
                alt="Sanasa General Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>

          {/* Links Columns */}
          <div className="flex flex-row gap-12 md:gap-24 flex-1 justify-center md:justify-start md:pl-20">
            {/* Column 1 */}
            <div className="flex flex-col gap-3.5">
              <Link href="/Admin/Home" className="hover:text-slate-200 transition-colors font-bold text-base no-underline">
                Home
              </Link>
              <Link href="/Admin/Claims" className="hover:text-slate-200 transition-colors font-bold text-base no-underline">
                Claims
              </Link>
              <Link href="/Admin/Registrations" className="hover:text-slate-200 transition-colors font-bold text-base no-underline">
                Registrations
              </Link>
              <Link href="/Admin/Contact" className="hover:text-slate-200 transition-colors font-bold text-base no-underline">
                Contact
              </Link>
            </div>

            {/* Column 2 */}
            <div className="flex flex-col gap-3.5">
              <Link href="/Admin/PolicyHolders" className="hover:text-slate-200 transition-colors font-extrabold text-base no-underline">
                Policy Holders
              </Link>
              <Link href="/Admin/Agents" className="hover:text-slate-200 transition-colors font-extrabold text-base no-underline">
                Agents
              </Link>
              <Link href="/Admin/Analytics" className="hover:text-slate-200 transition-colors font-extrabold text-base no-underline">
                Reports
              </Link>
            </div>
          </div>

          {/* Contact and Socials Info */}
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-12">
            {/* 24 Hours Contact */}
            <div className="flex items-center gap-3">
              {/* Phone Icon */}
              <div className="bg-white/10 p-3 rounded-full flex items-center justify-center">
                <HugeiconsIcon icon={Call02Icon} className="w-6 h-6 text-white" strokeWidth={2} />
              </div>
              <span className="font-black text-[15px] tracking-wide whitespace-nowrap">
                24 Hours : 0725 575 575
              </span>
            </div>

            <div className="flex flex-row gap-3 md:gap-4 items-center justify-center md:justify-end">
              {/* Facebook Icon */}
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full border border-white hover:bg-white hover:text-[#f59e0b] text-white flex items-center justify-center transition-all"
                aria-label="Facebook"
              >
                <HugeiconsIcon icon={Facebook01Icon} className="w-5 h-5" strokeWidth={2} />
              </a>

              {/* Instagram Icon */}
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full border border-white hover:bg-white hover:text-[#f59e0b] text-white flex items-center justify-center transition-all"
                aria-label="Instagram"
              >
                <HugeiconsIcon icon={InstagramIcon} className="w-5 h-5" strokeWidth={2} />
              </a>

              {/* TikTok Icon */}
              <a
                href="https://tiktok.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full border border-white hover:bg-white hover:text-[#f59e0b] text-white flex items-center justify-center transition-all"
                aria-label="TikTok"
              >
                <HugeiconsIcon icon={TiktokIcon} className="w-5 h-5" strokeWidth={2} />
              </a>

              {/* WhatsApp Icon */}
              <a
                href="https://whatsapp.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full border border-white hover:bg-white hover:text-[#f59e0b] text-white flex items-center justify-center transition-all"
                aria-label="WhatsApp"
              >
                <HugeiconsIcon icon={WhatsappIcon} className="w-5 h-5" strokeWidth={2} />
              </a>
            </div>

          </div>

        </div>

        {/* Bottom Section */}
        <div className="border-t border-white/20 pt-6 text-center select-none">
          <p className="text-sm font-bold opacity-90 tracking-wide">
            &copy; 2025 Sanasa General Insurance Co. LTD. All Rights Reserved.
          </p>
        </div>

      </div>
    </footer>
  );
}
