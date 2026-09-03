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

          <div className="flex flex-row gap-4 md:gap-5 items-center justify-center md:justify-end">
            {/* Facebook */}
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="text-white transition-transform duration-300 hover:scale-110"
            >
              <svg
                className="w-7 h-7 md:w-8 md:h-8"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12c0-5.523-4.477-10-10-10z" />
              </svg>
            </a>
            
            {/* Instagram */}
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="text-white transition-transform duration-300 hover:scale-110"
            >
              <svg
                className="w-7 h-7 md:w-8 md:h-8"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2C6.477 2 2 6.477 2 12c0 5.523 4.477 10 10 10s10-4.477 10-10c0-5.523-4.477-10-10-10zm4.5 12.8c0 .94-.76 1.7-1.7 1.7H9.2c-.94 0-1.7-.76-1.7-1.7V9.2c0-.94.76-1.7 1.7-1.7h5.6c.94 0 1.7.76 1.7 1.7v5.6z" />
                <path d="M12 9.75a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5zm0 3.25a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm3.25-3.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0z" />
              </svg>
            </a>

            {/* TikTok */}
            <a
              href="https://tiktok.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="TikTok"
              className="text-white transition-transform duration-300 hover:scale-110"
            >
              <svg
                className="w-7 h-7 md:w-8 md:h-8"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 2.89 3.5 2.78 1.19-.04 2.29-.68 2.89-1.72.33-.53.47-1.15.48-1.77.03-3.78.02-7.56.02-11.34z" />
              </svg>
            </a>

            {/* WhatsApp */}
            <a
              href="https://whatsapp.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
              className="text-white transition-transform duration-300 hover:scale-110"
            >
              <svg
                className="w-7 h-7 md:w-8 md:h-8"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
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
