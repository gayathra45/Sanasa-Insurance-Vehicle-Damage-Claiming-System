import React from "react";
import Image from "next/image";
import Link from "next/link";

interface FooterProps {
  className?: string;
}

export default function Footer({ className }: FooterProps) {
  return (
    <footer className={`bg-[#102A43] text-white pt-10 pb-5 px-6 md:px-16 w-full ${className || "mt-[60px]"}`}>
      <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row justify-between items-center md:items-start gap-8 text-center md:text-left">
        
        {/* Left Section - Logo */}
        <div className="flex-shrink-0 flex justify-center md:justify-start">
          <Link href="/">
            <Image
              src="/footer_logo.svg"
              alt="Sanasa General Insurance"
              width={140}
              height={55}
              className="h-auto max-w-[160px] object-contain"
              priority
            />
          </Link>
        </div>

        {/* Center Section - Navigation Links */}
        <div className="flex flex-col gap-2 font-medium text-base md:text-lg">
          <Link href="/" className="hover:text-white/80 transition-colors duration-150 no-underline text-white">
            Home
          </Link>
          <Link href="/home/News" className="hover:text-white/80 transition-colors duration-150 no-underline text-white">
            News
          </Link>
          <Link href="/home/contactUs" className="hover:text-white/80 transition-colors duration-150 no-underline text-white">
            Contact Us
          </Link>
          <Link href="/home/AboutUs" className="hover:text-white/80 transition-colors duration-150 no-underline text-white">
            About Us
          </Link>
        </div>

        {/* Center-Right Section - Contact Info */}
        <div className="flex flex-col gap-1 text-base md:text-[17px] font-normal">
          <span className="font-bold text-lg mb-1 block">Contact :</span>
          <span className="opacity-95">Tel. - 077 1974163</span>
          <span className="opacity-95">No. 07, Galle Road, Colombo 08</span>
        </div>

        {/* Right Section - Login/Sign Up & Social Media */}
        <div className="flex flex-col items-center md:items-end gap-5 flex-shrink-0 w-full md:w-auto">
          <div className="flex gap-[15px] flex-shrink-0 justify-center w-full md:w-auto">
            <Link
              href="/Login"
              className="bg-transparent border-2 border-white text-white py-2 px-6 rounded-full no-underline text-sm font-semibold transition-all duration-300 hover:bg-white hover:text-[#ffa500]"
            >
              Login
            </Link>
            <Link
              href="/SignUp"
              className="bg-white text-[#102A43] py-2 px-6 rounded-full no-underline text-sm font-semibold border-none cursor-pointer transition-all duration-300 hover:opacity-90 hover:-translate-y-[2px]"
            >
              Sign Up
            </Link>
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
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M9 8H6v4h3v12h5V12h3.642L18 8h-4V6.333C14 5.378 14.192 5 15.115 5H18V0h-3.808C10.596 0 9 1.583 9 4.615V8z" />
              </svg>
            </a>
            
            {/* Instagram */}
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="w-10 h-10 rounded-full bg-white/15 hover:bg-white text-white hover:text-[#102A43] flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-sm"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </a>

            {/* TikTok */}
            <a
              href="https://tiktok.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="TikTok"
              className="w-10 h-10 rounded-full bg-white/15 hover:bg-white text-white hover:text-[#102A43] flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-sm"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.86 4.43V13a7.84 7.84 0 0 0 4.84 1.66v-3.46a4.85 4.85 0 0 1-3.11-1.28v-3.23h4z" />
              </svg>
            </a>

            {/* WhatsApp */}
            <a
              href="https://whatsapp.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
              className="w-10 h-10 rounded-full bg-white/15 hover:bg-white text-white hover:text-[#102A43] flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-sm"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.196 8.196 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24zm4.8 11.58c-.26-.13-1.54-.76-1.78-.85-.24-.09-.41-.13-.59.13-.17.26-.68.85-.83 1.03-.15.17-.3.2-.56.07-.26-.13-1.1-.41-2.09-1.3-.77-.69-1.29-1.54-1.44-1.8-.15-.26-.02-.4.11-.53.12-.12.26-.3.39-.45.13-.15.17-.26.26-.43.09-.17.04-.33-.02-.46-.07-.13-.59-1.42-.81-1.95-.21-.51-.43-.44-.59-.45h-.5c-.17 0-.45.06-.69.33-.24.26-.91.89-.91 2.18s.93 2.53 1.06 2.7c.13.17 1.83 2.79 4.43 3.91.62.27 1.1.43 1.48.55.62.2 1.19.17 1.64.1.5-.07 1.54-.63 1.76-1.24.22-.61.22-1.13.15-1.24-.06-.11-.23-.17-.49-.3z" />
              </svg>
            </a>
          </div>
        </div>

      </div>

      {/* Copyright Bar */}
      <div className="max-w-[1200px] mx-auto text-center pt-5 mt-8 border-t border-white/20 text-[13px] opacity-90">
        <p className="m-0">
          © 2025 Sanasa General Insurance Co. LTD. All Rights Reserved.
        </p>
      </div>
    </footer>
  );
}
