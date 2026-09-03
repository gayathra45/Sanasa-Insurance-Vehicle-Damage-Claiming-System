"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";

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
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-6 h-6 text-white"
                >
                  <path fillRule="evenodd" d="M1.5 4.5a3 3 0 0 1 3-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 0 1-.694 1.955l-1.293.97c1.358 3.35 4.07 6.062 7.42 7.42l.97-1.293a1.875 1.875 0 0 1 1.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 0 1-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5Z" clipRule="evenodd" />
                </svg>
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
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" />
                </svg>
              </a>

              {/* Instagram Icon */}
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full border border-white hover:bg-white hover:text-[#f59e0b] text-white flex items-center justify-center transition-all"
                aria-label="Instagram"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>

              {/* TikTok Icon */}
              <a
                href="https://tiktok.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full border border-white hover:bg-white hover:text-[#f59e0b] text-white flex items-center justify-center transition-all"
                aria-label="TikTok"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.86 4.43V13a7.84 7.84 0 0 0 4.84 1.66v-3.46a4.85 4.85 0 0 1-3.11-1.28v-3.23h4z" />
                </svg>
              </a>

              {/* WhatsApp Icon */}
              <a
                href="https://whatsapp.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full border border-white hover:bg-white hover:text-[#f59e0b] text-white flex items-center justify-center transition-all"
                aria-label="WhatsApp"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.196 8.196 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24zm4.8 11.58c-.26-.13-1.54-.76-1.78-.85-.24-.09-.41-.13-.59.13-.17.26-.68.85-.83 1.03-.15.17-.3.2-.56.07-.26-.13-1.1-.41-2.09-1.3-.77-.69-1.29-1.54-1.44-1.8-.15-.26-.02-.4.11-.53.12-.12.26-.3.39-.45.13-.15.17-.26.26-.43.09-.17.04-.33-.02-.46-.07-.13-.59-1.42-.81-1.95-.21-.51-.43-.44-.59-.45h-.5c-.17 0-.45.06-.69.33-.24.26-.91.89-.91 2.18s.93 2.53 1.06 2.7c.13.17 1.83 2.79 4.43 3.91.62.27 1.1.43 1.48.55.62.2 1.19.17 1.64.1.5-.07 1.54-.63 1.76-1.24.22-.61.22-1.13.15-1.24-.06-.11-.23-.17-.49-.3z" />
                </svg>
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
