"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import OfficeStaffNavbar from "@/app/Components/Office_Staff/Navbar";
import UserAvatarDropdown from "@/app/Components/UserAvatarDropdown";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Menu01Icon,
  Notification01Icon,
  Location01Icon,
  Call02Icon,
  Clock01Icon,
  Search01Icon,
  Shield01Icon,
  Globe02Icon,
  UserIcon,
  Cancel01Icon,
  CheckmarkCircle01Icon,
  Alert02Icon,
  BubbleChatIcon,
  Loading03Icon,
  File01Icon,
  Tick01Icon,
  ArrowRight01Icon
} from "@hugeicons/core-free-icons";

interface Branch {
  id: string;
  name: string;
  province: string;
  address: string;
  phone: string;
  email: string;
  manager: string;
  managerPhone: string;
}

const BRANCHES: Branch[] = [
  {
    id: "galle",
    name: "Galle",
    province: "Southern Province",
    address: "No. 45, Colombo Road, Kaluwella, Galle",
    phone: "091-2245890",
    email: "galle@sanasainsurance.lk",
    manager: "Mr. Sarath Weerakkody",
    managerPhone: "077-3456781"
  },
  {
    id: "colombo",
    name: "Colombo (Head Office)",
    province: "Western Province",
    address: "No. 172, Elvitigala Mawatha, Colombo 08",
    phone: "011-2003000",
    email: "headoffice@sanasainsurance.lk",
    manager: "Mr. Priyantha Bandara",
    managerPhone: "077-1234567"
  },
  {
    id: "kandy",
    name: "Kandy",
    province: "Central Province",
    address: "No. 88, Dalada Veediya, Kandy",
    phone: "081-2234500",
    email: "kandy@sanasainsurance.lk",
    manager: "Mr. Chaminda Senanayake",
    managerPhone: "077-4567890"
  },
  {
    id: "matara",
    name: "Matara",
    province: "Southern Province",
    address: "No. 12, Anagarika Dharmapala Mawatha, Matara",
    phone: "041-2226700",
    email: "matara@sanasainsurance.lk",
    manager: "Mr. Dilshan Fernando",
    managerPhone: "077-5678901"
  },
  {
    id: "kurunegala",
    name: "Kurunegala",
    province: "North Western Province",
    address: "No. 54, Negombo Road, Kurunegala",
    phone: "037-2231200",
    email: "kurunegala@sanasainsurance.lk",
    manager: "Mr. Ranjith Kumara",
    managerPhone: "077-6789012"
  },
  {
    id: "gampaha",
    name: "Gampaha",
    province: "Western Province",
    address: "No. 23, Yakkala Road, Gampaha",
    phone: "033-2228900",
    email: "gampaha@sanasainsurance.lk",
    manager: "Mr. Nalaka Jayasuriya",
    managerPhone: "077-7890123"
  },
  {
    id: "kalutara",
    name: "Kalutara",
    province: "Western Province",
    address: "No. 76, Main Street, Kalutara",
    phone: "034-2225400",
    email: "kalutara@sanasainsurance.lk",
    manager: "Mr. Saman Perera",
    managerPhone: "077-8901234"
  },
  {
    id: "negombo",
    name: "Negombo",
    province: "Western Province",
    address: "No. 105, Greens Road, Negombo",
    phone: "031-2238100",
    email: "negombo@sanasainsurance.lk",
    manager: "Mr. Jude Prasanna",
    managerPhone: "077-9012345"
  },
  {
    id: "anuradhapura",
    name: "Anuradhapura",
    province: "North Central Province",
    address: "No. 67, Maithripala Senanayake Mawatha, Anuradhapura",
    phone: "025-2223800",
    email: "anuradhapura@sanasainsurance.lk",
    manager: "Mr. Jayasiri Wickramasinghe",
    managerPhone: "077-0123456"
  },
  {
    id: "ratnapura",
    name: "Ratnapura",
    province: "Sabaragamuwa Province",
    address: "No. 34, Main Street, Ratnapura",
    phone: "045-2224100",
    email: "ratnapura@sanasainsurance.lk",
    manager: "Mr. Mahesh Dissanayake",
    managerPhone: "077-1122334"
  },
  {
    id: "jaffna",
    name: "Jaffna",
    province: "Northern Province",
    address: "No. 142, Hospital Road, Jaffna",
    phone: "021-2225600",
    email: "jaffna@sanasainsurance.lk",
    manager: "Mr. S. Sivakumar",
    managerPhone: "077-2233445"
  },
  {
    id: "badulla",
    name: "Badulla",
    province: "Uva Province",
    address: "No. 18, Lower King Street, Badulla",
    phone: "055-2224900",
    email: "badulla@sanasainsurance.lk",
    manager: "Mr. Nuwan Abeykoon",
    managerPhone: "077-3344556"
  },
  {
    id: "hambantota",
    name: "Hambantota",
    province: "Southern Province",
    address: "No. 29, Tissa Road, Hambantota",
    phone: "047-2220500",
    email: "hambantota@sanasainsurance.lk",
    manager: "Mr. K. G. Sunil",
    managerPhone: "077-4455667"
  }
];

const PROVINCES = [
  "All",
  "Western",
  "Southern",
  "Central",
  "North Western",
  "North Central",
  "Sabaragamuwa",
  "Uva",
  "Northern"
];

export default function OfficeStaffContact() {
  const [branch, setBranch] = useState("Galle");
  const [staffName, setStaffName] = useState("Office Staff");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProvince, setSelectedProvince] = useState("All");

  // Form State
  const [formData, setFormData] = useState({
    department: "IT & Portal Support",
    subject: "",
    message: ""
  });
  const [sending, setSending] = useState(false);

  // Popup feedback state
  const [popup, setPopup] = useState<{ show: boolean; title: string; message: string; type: "success" | "alert" }>({
    show: false,
    title: "",
    message: "",
    type: "success"
  });

  const [copiedText, setCopiedText] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedStaff = sessionStorage.getItem("logged_in_staff");
      if (savedStaff) {
        try {
          const staffObj = JSON.parse(savedStaff);
          if (staffObj) {
            if (staffObj.branch) setBranch(staffObj.branch);
            if (staffObj.name || staffObj.username) {
              setStaffName(staffObj.name || staffObj.username);
            }
          }
        } catch (e) {
          console.error("Error parsing logged_in_staff", e);
        }
      }
    }
  }, []);

  const handleCopy = (text: string, label: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedText(label);
      setTimeout(() => setCopiedText(null), 2000);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject.trim() || !formData.message.trim()) {
      setPopup({
        show: true,
        title: "Missing Fields",
        message: "Please enter both subject and message before sending.",
        type: "alert"
      });
      return;
    }

    setSending(true);
    setTimeout(() => {
      setSending(false);
      setPopup({
        show: true,
        title: "Message Sent",
        message: `Your inquiry has been successfully sent to the ${formData.department}. The team will respond via email shortly.`,
        type: "success"
      });
      setFormData({
        department: "IT & Portal Support",
        subject: "",
        message: ""
      });
    }, 800);
  };

  // Find active branch details
  const currentBranch = BRANCHES.find(
    (b) => b.name.toLowerCase().includes(branch.toLowerCase()) || branch.toLowerCase().includes(b.name.toLowerCase())
  ) || BRANCHES[0];

  // Filtered branches
  const filteredBranches = BRANCHES.filter((b) => {
    const matchProv = selectedProvince === "All" || b.province.toLowerCase().includes(selectedProvince.toLowerCase());
    const matchSearch =
      b.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      b.address.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      b.manager.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      b.phone.includes(searchQuery.trim());
    return matchProv && matchSearch;
  });

  return (
    <div className="flex flex-col min-h-screen bg-white font-sans text-slate-800">
      <div className="flex flex-1 flex-row min-h-0">
        <OfficeStaffNavbar />

        <div className="flex-1 flex flex-col min-w-0 max-w-full overflow-x-hidden">
          {/* Top Header Bar */}
          <header className="bg-white border-b border-slate-100 text-slate-800 px-8 py-4 flex justify-between items-center select-none shadow-xs flex-shrink-0 h-[80px] sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("open-mobile-menu"))}
                className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 active:scale-95 transition-all cursor-pointer focus:outline-none"
                aria-label="Open mobile navigation menu"
              >
                <HugeiconsIcon icon={Menu01Icon} className="w-6 h-6" strokeWidth={2.5} />
              </button>
              <h1 className="text-xl font-semibold text-slate-800 flex items-center gap-2 pl-2 lg:pl-0">
                <span className="bg-[#102A43] text-white text-base px-4 py-2 rounded-xl font-semibold shadow-xs tracking-wide">
                  {branch} Branch
                </span>
                <span className="hidden md:inline text-slate-400 font-medium">— Contact Us</span>
              </h1>
            </div>

            <div className="flex items-center gap-5">
              <Link
                href="/Office_Staff/Notifications"
                className="relative p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer focus:outline-none flex items-center justify-center"
                aria-label="Notifications"
              >
                <HugeiconsIcon icon={Notification01Icon} className="w-6 h-6 text-slate-500 hover:text-slate-800" strokeWidth={2} />
              </Link>
              <UserAvatarDropdown userType="office_staff" />
            </div>
          </header>

          {/* Main Content Area */}
          <main className="flex-1 p-6 lg:p-10 bg-white overflow-y-auto">
            <div className="max-w-6xl mx-auto space-y-8">

              {/* Title Section */}
              <div className="space-y-1">
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Contact & Support Center
                </h2>
                <p className="text-slate-500 text-sm font-medium">
                  Direct contact details for {branch} Branch, Sanasa Head Office, and regional branches across Sri Lanka.
                </p>
              </div>

              {/* Top 3 Clean Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 select-none">
                {/* Card 1: Assigned Branch */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                        <HugeiconsIcon icon={Location01Icon} className="w-5 h-5" strokeWidth={2} />
                      </div>
                      <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        Your Branch
                      </span>
                    </div>

                    <div>
                      <h3 className="font-bold text-base text-slate-900">{currentBranch.name} Branch</h3>
                      <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">{currentBranch.address}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-1 text-xs">
                      <p className="text-slate-600">
                        <span className="text-slate-400 font-medium">Phone:</span>{" "}
                        <strong className="text-slate-800 font-mono">{currentBranch.phone}</strong>
                      </p>
                      <p className="text-slate-600">
                        <span className="text-slate-400 font-medium">Manager:</span>{" "}
                        <strong className="text-slate-800">{currentBranch.manager}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 mt-2">
                    <button
                      onClick={() => handleCopy(`${currentBranch.name} Branch\n${currentBranch.address}\nTel: ${currentBranch.phone}\nEmail: ${currentBranch.email}`, "branch-info")}
                      className="w-full py-2 text-xs font-semibold rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                    >
                      {copiedText === "branch-info" ? "✓ Copied" : "Copy Branch Details"}
                    </button>
                  </div>
                </div>

                {/* Card 2: Head Office */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 text-[#102A43] flex items-center justify-center">
                        <HugeiconsIcon icon={Shield01Icon} className="w-5 h-5" strokeWidth={2} />
                      </div>
                      <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        Head Office
                      </span>
                    </div>

                    <div>
                      <h3 className="font-bold text-base text-slate-900">Sanasa General Insurance HQ</h3>
                      <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                        No. 172, Elvitigala Mawatha, Colombo 08
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-1 text-xs">
                      <p className="text-slate-600">
                        <span className="text-slate-400 font-medium">Switchboard:</span>{" "}
                        <strong className="text-slate-800 font-mono">+94 112 003 000</strong>
                      </p>
                      <p className="text-slate-600 truncate">
                        <span className="text-slate-400 font-medium">Email:</span>{" "}
                        <strong className="text-slate-800">headoffice@sanasainsurance.lk</strong>
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 mt-2">
                    <button
                      onClick={() => handleCopy("+94 112 003 000", "hq-phone")}
                      className="w-full py-2 text-xs font-semibold rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                    >
                      {copiedText === "hq-phone" ? "✓ Copied" : "Copy HQ Hotline"}
                    </button>
                  </div>
                </div>

                {/* Card 3: Emergency Hotline */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                        <HugeiconsIcon icon={Call02Icon} className="w-5 h-5" strokeWidth={2} />
                      </div>
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        24/7 Hotline
                      </span>
                    </div>

                    <div>
                      <h3 className="font-bold text-base text-slate-900">Accident & Roadside Assistance</h3>
                      <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                        Toll-free nationwide rapid spot assessor dispatch
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-1 text-xs">
                      <p className="text-slate-600">
                        <span className="text-slate-400 font-medium">Short Code:</span>{" "}
                        <strong className="text-emerald-700 font-mono text-sm font-bold">1330</strong>
                      </p>
                      <p className="text-slate-600">
                        <span className="text-slate-400 font-medium">Emergency Line:</span>{" "}
                        <strong className="text-slate-800 font-mono">011-2003000</strong>
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 mt-2">
                    <button
                      onClick={() => handleCopy("1330", "1330-hotline")}
                      className="w-full py-2 text-xs font-semibold rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors cursor-pointer"
                    >
                      {copiedText === "1330-hotline" ? "✓ Copied" : "Copy 1330 Hotline"}
                    </button>
                  </div>
                </div>
              </div>

              {/* 2-Column Section: Operational Details & Contact Form */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left Column (5 Cols): Hours, Key Extensions, Map */}
                <div className="lg:col-span-5 space-y-6">
                  {/* Hours & Extensions */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                        <HugeiconsIcon icon={Clock01Icon} className="w-4 h-4 text-blue-600" strokeWidth={2} />
                        Branch Operating Hours
                      </h3>
                      <div className="mt-3 space-y-2 text-xs divide-y divide-slate-100">
                        <div className="pt-1 flex justify-between items-center text-slate-700">
                          <span>Monday – Friday:</span>
                          <strong className="font-semibold text-slate-900">8:30 AM – 5:15 PM</strong>
                        </div>
                        <div className="pt-2 flex justify-between items-center text-slate-700">
                          <span>Saturday:</span>
                          <strong className="font-semibold text-slate-900">8:30 AM – 1:00 PM</strong>
                        </div>
                        <div className="pt-2 flex justify-between items-center text-slate-500">
                          <span>Sunday & Public Holidays:</span>
                          <span className="font-semibold text-red-500">Closed</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2 mb-3">
                        <HugeiconsIcon icon={Call02Icon} className="w-4 h-4 text-blue-600" strokeWidth={2} />
                        Head Office Department Extensions
                      </h3>
                      <div className="space-y-2.5 text-xs">
                        {[
                          { name: "Motor Claims & Approvals", ext: "Ext: 402 / 405", email: "claims.ops@sanasainsurance.lk" },
                          { name: "Motor Underwriting Desk", ext: "Ext: 310 / 312", email: "underwriting@sanasainsurance.lk" },
                          { name: "IT & Portal Support", ext: "Ext: 104 / 108", email: "portal.support@sanasainsurance.lk" },
                          { name: "Legal & Police Liaison", ext: "Ext: 601", email: "legal@sanasainsurance.lk" }
                        ].map((dept, idx) => (
                          <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between">
                            <div>
                              <span className="font-bold text-slate-800 block">{dept.name}</span>
                              <span className="text-[11px] text-slate-400">{dept.email}</span>
                            </div>
                            <span className="font-mono text-xs font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                              {dept.ext}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Map Card */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <HugeiconsIcon icon={Location01Icon} className="w-4 h-4 text-slate-600" strokeWidth={2} />
                        Branch Map Location
                      </h3>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("Sanasa General Insurance " + currentBranch.name)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-blue-600 hover:underline"
                      >
                        Open in Maps →
                      </a>
                    </div>

                    <div className="w-full h-44 rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                      <iframe
                        src={`https://maps.google.com/maps?q=${encodeURIComponent("Sanasa General Insurance " + currentBranch.name + " Sri Lanka")}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        allowFullScreen={true}
                        loading="lazy"
                        className="w-full h-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column (7 Cols): Clean Inquiry / Support Form */}
                <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
                  <div className="mb-6 space-y-1">
                    <h3 className="text-lg font-bold text-slate-900">
                      Send an Inquiry or Support Request
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Submit an internal message to Head Office departments. You will receive an email confirmation.
                    </p>
                  </div>

                  <form onSubmit={handleFormSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Staff Member</label>
                        <input
                          type="text"
                          value={staffName}
                          disabled
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 text-xs font-medium cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Origin Branch</label>
                        <input
                          type="text"
                          value={`${branch} Branch`}
                          disabled
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 text-xs font-medium cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <div className="text-xs">
                      <label className="block font-semibold text-slate-700 mb-1">
                        Target Department <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white"
                      >
                        <option value="IT & Portal Support">Core IT & Portal Systems Support</option>
                        <option value="Motor Claims Department">Motor Claims & Survey Approvals</option>
                        <option value="Underwriting Desk">Motor Underwriting & Endorsements</option>
                        <option value="Legal & Police Inquiries">Legal, Compliance & Police Liaison</option>
                        <option value="General Administration">General Operations & Head Office</option>
                      </select>
                    </div>

                    <div className="text-xs">
                      <label className="block font-semibold text-slate-700 mb-1">
                        Subject <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Brief summary of your inquiry..."
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-slate-400"
                        required
                      />
                    </div>

                    <div className="text-xs">
                      <label className="block font-semibold text-slate-700 mb-1">
                        Message Details <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        rows={5}
                        placeholder="Write your message, policy/claim reference numbers, or details..."
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-slate-400 leading-relaxed resize-y"
                        required
                      />
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={sending}
                        className="px-6 py-2.5 bg-[#102A43] hover:bg-[#000080] active:scale-95 text-white font-semibold text-xs rounded-xl transition-all cursor-pointer border-none shadow-xs flex items-center gap-2"
                      >
                        {sending ? (
                          <>
                            <HugeiconsIcon icon={Loading03Icon} className="w-4 h-4 animate-spin text-white" strokeWidth={2.5} />
                            <span>Sending...</span>
                          </>
                        ) : (
                          <span>Send Message</span>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Bottom Section: Clean Island-wide Branches Directory */}
              <div className="space-y-4 pt-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">All Sanasa Branches in Sri Lanka</h3>
                    <p className="text-xs text-slate-500 font-medium">Search contact numbers and locations of all branch offices.</p>
                  </div>

                  {/* Search and filter */}
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <HugeiconsIcon icon={Search01Icon} className="w-3.5 h-3.5" strokeWidth={2.5} />
                      </span>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search town, manager..."
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                      />
                    </div>

                    <select
                      value={selectedProvince}
                      onChange={(e) => setSelectedProvince(e.target.value)}
                      className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                    >
                      {PROVINCES.map((p) => (
                        <option key={p} value={p}>
                          {p === "All" ? "All Provinces" : `${p} Province`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Branches Table / Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredBranches.map((b) => {
                    const isOwn = b.name.toLowerCase().includes(branch.toLowerCase()) || branch.toLowerCase().includes(b.name.toLowerCase());

                    return (
                      <div
                        key={b.id}
                        className={`bg-white border rounded-2xl p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between gap-3 ${
                          isOwn ? "border-blue-400 ring-1 ring-blue-100" : "border-slate-200"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <h4 className="font-bold text-sm text-slate-900">{b.name} Branch</h4>
                            {isOwn ? (
                              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                                Your Branch
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-medium">{b.province}</span>
                            )}
                          </div>

                          <p className="text-xs text-slate-500 font-medium leading-relaxed">{b.address}</p>

                          <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1 text-xs">
                            <p className="text-slate-600">
                              <span className="text-slate-400">Tel:</span>{" "}
                              <strong className="text-slate-800 font-mono">{b.phone}</strong>
                            </p>
                            <p className="text-slate-600">
                              <span className="text-slate-400">Manager:</span>{" "}
                              <strong className="text-slate-800">{b.manager}</strong> ({b.managerPhone})
                            </p>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                          <a
                            href={`mailto:${b.email}`}
                            className="text-xs font-semibold text-blue-600 hover:underline truncate max-w-[170px]"
                          >
                            {b.email}
                          </a>
                          <button
                            onClick={() => handleCopy(`${b.name} Branch\n${b.address}\nTel: ${b.phone}\nManager: ${b.manager} (${b.managerPhone})\nEmail: ${b.email}`, b.id)}
                            className="text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer border-none"
                          >
                            {copiedText === b.id ? "✓ Copied" : "Copy"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </main>
        </div>
      </div>

      {/* Alert / Notification Popup */}
      {popup.show && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-xl border border-slate-100 p-6 flex flex-col gap-4 text-left">
            <div className="flex items-center gap-3">
              {popup.type === "success" ? (
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-5 h-5" strokeWidth={2.5} />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                  <HugeiconsIcon icon={Alert02Icon} className="w-5 h-5" strokeWidth={2.5} />
                </div>
              )}
              <h3 className="font-bold text-base text-slate-800 tracking-tight leading-none">
                {popup.title}
              </h3>
            </div>
            <p className="text-slate-500 text-xs font-medium leading-relaxed">{popup.message}</p>
            <div className="flex justify-end mt-2 select-none">
              <button
                onClick={() => setPopup({ ...popup, show: false })}
                className="px-6 py-2 bg-[#102A43] hover:bg-[#000080] active:scale-95 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer border-none"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Chat Button */}
      <button
        className="fixed bottom-8 right-8 z-40 bg-[#00ddff] hover:bg-[#00c8e6] text-white p-5 rounded-full shadow-2xl transition-all duration-150 hover:scale-110 active:scale-95 cursor-pointer focus:outline-none border-none flex items-center justify-center"
        aria-label="Chat support"
      >
        <HugeiconsIcon icon={BubbleChatIcon} className="w-7 h-7 text-white" strokeWidth={2} />
      </button>
    </div>
  );
}
