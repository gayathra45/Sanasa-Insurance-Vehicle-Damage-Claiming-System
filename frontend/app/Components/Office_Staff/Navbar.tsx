"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DashboardSquare01Icon,
  Shield01Icon,
  UserAdd01Icon,
  UserGroupIcon,
  Folder01Icon,
  Briefcase01Icon,
  Analytics01Icon,
  Call02Icon,
  ArrowRight01Icon,
  Cancel01Icon,
  Logout01Icon
} from "@hugeicons/core-free-icons";

export default function OfficeStaffNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setIsMobileOpen(true);
    window.addEventListener("open-mobile-menu", handleOpen);
    return () => window.removeEventListener("open-mobile-menu", handleOpen);
  }, []);

  const menuItems = [
    { name: "Home", href: "/Office_Staff/Dashboard" },
    { name: "Claims", href: "/Office_Staff/Claims" },
    { name: "Registrations", href: "/Office_Staff/Registrations" },
    { name: "Policy Holders", href: "/Office_Staff/PolicyHolders" },
    { name: "Agents", href: "/Office_Staff/Agents" },
    { name: "Reports", href: "/Office_Staff/Reports" },
    { name: "Contact", href: "/Office_Staff/Contact" },
  ];

  const getIcon = (name: string) => {
    switch (name.toLowerCase()) {
      case "home":
      case "dashboard":
        return <HugeiconsIcon icon={DashboardSquare01Icon} className="w-5 h-5 flex-shrink-0" strokeWidth={2} />;
      case "claims":
        return <HugeiconsIcon icon={Shield01Icon} className="w-5 h-5 flex-shrink-0" strokeWidth={2} />;
      case "registrations":
        return <HugeiconsIcon icon={UserAdd01Icon} className="w-5 h-5 flex-shrink-0" strokeWidth={2} />;
      case "policy holders":
        return <HugeiconsIcon icon={Folder01Icon} className="w-5 h-5 flex-shrink-0" strokeWidth={2} />;
      case "agents":
        return <HugeiconsIcon icon={Briefcase01Icon} className="w-5 h-5 flex-shrink-0" strokeWidth={2} />;
      case "staff":
        return <HugeiconsIcon icon={UserGroupIcon} className="w-5 h-5 flex-shrink-0" strokeWidth={2} />;
      case "reports":
      case "analytics & reports":
        return <HugeiconsIcon icon={Analytics01Icon} className="w-5 h-5 flex-shrink-0" strokeWidth={2} />;
      case "contact":
        return <HugeiconsIcon icon={Call02Icon} className="w-5 h-5 flex-shrink-0" strokeWidth={2} />;
      default:
        return null;
    }
  };

  const handleLogout = () => {
    sessionStorage.clear();
    router.push("/Login");
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-[280px] bg-[#102A43] h-screen sticky top-0 flex-col text-white shadow-xl flex-shrink-0 select-none z-20">
        {/* Logo Section */}
        <div className="py-8 px-6 flex flex-col items-center border-b border-white/5">
          <div className="relative w-44 h-16">
            <Image
              src="/logo.png"
              alt="Sanasa General Insurance Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>

        {/* Menu Navigation Links */}
        <nav className="flex-1 mt-6 flex flex-col">
          {menuItems.map((item) => {
            // Check if active (matches exact path or prefix path)
            const isActive = pathname === item.href || (item.href !== "/Office_Staff/Dashboard" && pathname?.startsWith(item.href));
            const hasChevron = ["policy holders", "agents", "staff", "analytics & reports", "claims", "registrations", "reports"].includes(item.name.toLowerCase());

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`mx-4 my-1 px-4 py-3 text-base font-semibold transition-all duration-150 no-underline flex items-center gap-3 rounded-xl group ${
                  isActive
                    ? "bg-[#1b75e0] text-white shadow-sm font-bold"
                    : "text-slate-100 hover:bg-white/10 hover:text-white"
                }`}
              >
                {getIcon(item.name)}
                <span>{item.name}</span>
                {hasChevron && (
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    className="w-4 h-4 ml-auto text-slate-100 opacity-60 group-hover:opacity-100 transition-opacity"
                    strokeWidth={2.5}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Logout Footer Section */}
        <div className="p-6 mt-auto">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-red-500 font-bold text-base transition-colors duration-150 bg-transparent border-none cursor-pointer w-full"
          >
            <HugeiconsIcon icon={Logout01Icon} className="w-5 h-5" strokeWidth={2.5} />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-md transition-opacity duration-200"
            onClick={() => setIsMobileOpen(false)}
          />

          {/* Drawer content */}
          <aside className="relative w-[280px] max-w-xs bg-gradient-to-b from-[#111c2a] via-[#102a43] to-[#09111b] border-r border-white/10 h-full flex flex-col text-white shadow-2xl p-5 select-none duration-200">
            {/* Close Button */}
            <button
              onClick={() => setIsMobileOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer border-none bg-transparent"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="w-6 h-6" strokeWidth={2.5} />
            </button>

            {/* Logo Section */}
            <div className="py-6 px-2 flex items-center border-b border-white/5 mb-6 mt-4">
              <div className="relative w-36 h-12">
                <Image
                  src="/logo.png"
                  alt="Sanasa General Insurance Logo"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </div>

            {/* Menu Links */}
            <nav className="flex-1 flex flex-col gap-1 overflow-y-auto">
              {menuItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/Office_Staff/Dashboard" && pathname?.startsWith(item.href));
                const hasChevron = ["policy holders", "agents", "staff", "analytics & reports", "claims", "registrations", "reports"].includes(item.name.toLowerCase());

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMobileOpen(false)}
                    className={`px-4 py-3 text-base font-semibold transition-all duration-150 no-underline flex items-center gap-3 rounded-xl relative ${
                      isActive
                        ? "bg-[#1b75e0] text-white shadow-sm font-bold"
                        : "text-slate-100 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {isActive && <div className="absolute left-1 w-2 h-5 bg-[#00ddff] rounded-full" />}
                    {getIcon(item.name)}
                    <span>{item.name}</span>
                    {hasChevron && (
                      <HugeiconsIcon
                        icon={ArrowRight01Icon}
                        className="w-4 h-4 ml-auto text-slate-100 opacity-60 group-hover:opacity-100 transition-opacity"
                        strokeWidth={2.5}
                      />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Logout Footer */}
            <div className="pt-6 border-t border-white/5 mt-auto">
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-red-500 font-bold text-base transition-colors duration-150 bg-transparent border-none cursor-pointer w-full"
              >
                <HugeiconsIcon icon={Logout01Icon} className="w-5 h-5" strokeWidth={2.5} />
                Logout
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
