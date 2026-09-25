import React from "react";
import Image from "next/image";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Facebook01Icon, InstagramIcon, TiktokIcon, WhatsappIcon } from "@hugeicons/core-free-icons";

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
      <div className="max-w-[1200px] mx-auto text-center pt-5 mt-8 border-t border-white/20 text-[13px] opacity-90">
        <p className="m-0">
          © 2025 Sanasa General Insurance Co. LTD. All Rights Reserved.
        </p>
      </div>
    </footer>
  );
}
