"use client";

import React, { useState, useEffect } from "react";
import AdminNavbar from "@/app/Components/Admin/Navbar";
import UserAvatarDropdown from "@/app/Components/UserAvatarDropdown";
import { API_URL } from "@/app/config";
import SimpleLoader from "@/app/Components/SimpleLoader";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  BubbleChatIcon,
  Menu01Icon,
  Call02Icon,
  Mail01Icon,
  Location01Icon,
  Building01Icon,
  UserGroupIcon,
  Clock01Icon,
  CheckmarkCircle01Icon,
  Alert02Icon,
  Search01Icon,
  SentIcon,
  Cancel01Icon,
  RefreshIcon,
  Loading03Icon,
  File01Icon,
  SecurityCheckIcon,
  ArrowRight01Icon,
  UserIcon,
  Tick01Icon,
  Copy01Icon,
  Edit02Icon
} from "@hugeicons/core-free-icons";

interface Inquiry {
  _id: string;
  ticketId: string;
  senderName: string;
  senderEmail: string;
  senderPhone?: string;
  senderRole: "Policy Holder" | "Agent" | "Office Staff" | "Public Visitor" | "General";
  category: string;
  priority: "Normal" | "High" | "Urgent";
  subject: string;
  message: string;
  branch?: string;
  status: "Pending" | "In Review" | "Resolved" | "Closed";
  adminNotes?: string;
  replyMessage?: string;
  repliedAt?: string;
  repliedBy?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  createdAt: string;
}

interface BranchContact {
  id: string;
  name: string;
  province: string;
  district: string;
  address: string;
  phone: string;
  hotline: string;
  email: string;
  manager: string;
  managerPhone: string;
  hours: string;
}

const BRANCH_DIRECTORY: BranchContact[] = [
  {
    id: "galle",
    name: "Galle Branch",
    province: "Southern Province",
    district: "Galle",
    address: "No. 45, Colombo Road, Kaluwella, Galle",
    phone: "091-2245890",
    hotline: "091-2245899",
    email: "galle@sanasainsurance.lk",
    manager: "Mr. Sarath Weerakkody",
    managerPhone: "077-3456781",
    hours: "Mon - Fri: 8:30 AM – 5:00 PM | Sat: 8:30 AM – 1:00 PM"
  },
  {
    id: "colombo_ho",
    name: "Colombo Head Office",
    province: "Western Province",
    district: "Colombo",
    address: "No. 172, Elvitigala Mawatha, Colombo 08",
    phone: "011-2003000",
    hotline: "011-2003009",
    email: "headoffice@sanasainsurance.lk",
    manager: "Mr. Priyantha Bandara (GM Ops)",
    managerPhone: "077-1234567",
    hours: "Mon - Fri: 8:30 AM – 5:15 PM (24/7 Hotline)"
  },
  {
    id: "kandy",
    name: "Kandy Branch",
    province: "Central Province",
    district: "Kandy",
    address: "No. 88, Dalada Veediya, Kandy",
    phone: "081-2234500",
    hotline: "081-2234599",
    email: "kandy@sanasainsurance.lk",
    manager: "Mr. Chaminda Senanayake",
    managerPhone: "077-4567890",
    hours: "Mon - Fri: 8:30 AM – 5:00 PM | Sat: 8:30 AM – 1:00 PM"
  },
  {
    id: "matara",
    name: "Matara Branch",
    province: "Southern Province",
    district: "Matara",
    address: "No. 12, Anagarika Dharmapala Mawatha, Matara",
    phone: "041-2226700",
    hotline: "041-2226799",
    email: "matara@sanasainsurance.lk",
    manager: "Mr. Dilshan Fernando",
    managerPhone: "077-5678901",
    hours: "Mon - Fri: 8:30 AM – 5:00 PM | Sat: 8:30 AM – 1:00 PM"
  },
  {
    id: "kurunegala",
    name: "Kurunegala Branch",
    province: "North Western Province",
    district: "Kurunegala",
    address: "No. 54, Negombo Road, Kurunegala",
    phone: "037-2231200",
    hotline: "037-2231299",
    email: "kurunegala@sanasainsurance.lk",
    manager: "Mr. Ranjith Kumara",
    managerPhone: "077-6789012",
    hours: "Mon - Fri: 8:30 AM – 5:00 PM | Sat: 8:30 AM – 1:00 PM"
  },
  {
    id: "gampaha",
    name: "Gampaha Branch",
    province: "Western Province",
    district: "Gampaha",
    address: "No. 23, Yakkala Road, Gampaha",
    phone: "033-2228900",
    hotline: "033-2228999",
    email: "gampaha@sanasainsurance.lk",
    manager: "Mr. Nalaka Jayasuriya",
    managerPhone: "077-7890123",
    hours: "Mon - Fri: 8:30 AM – 5:00 PM | Sat: 8:30 AM – 1:00 PM"
  },
  {
    id: "anuradhapura",
    name: "Anuradhapura Branch",
    province: "North Central Province",
    district: "Anuradhapura",
    address: "No. 67, Main Street, New Town, Anuradhapura",
    phone: "025-2224500",
    hotline: "025-2224599",
    email: "anuradhapura@sanasainsurance.lk",
    manager: "Mr. Wasantha Dissanayake",
    managerPhone: "077-8901234",
    hours: "Mon - Fri: 8:30 AM – 5:00 PM | Sat: 8:30 AM – 1:00 PM"
  },
  {
    id: "jaffna",
    name: "Jaffna Branch",
    province: "Northern Province",
    district: "Jaffna",
    address: "No. 112, Hospital Road, Jaffna",
    phone: "021-2223400",
    hotline: "021-2223499",
    email: "jaffna@sanasainsurance.lk",
    manager: "Mr. K. Tharmarajah",
    managerPhone: "077-9012345",
    hours: "Mon - Fri: 8:30 AM – 5:00 PM | Sat: 8:30 AM – 1:00 PM"
  },
  {
    id: "ratnapura",
    name: "Ratnapura Branch",
    province: "Sabaragamuwa Province",
    district: "Ratnapura",
    address: "No. 34, Colombo Road, Ratnapura",
    phone: "045-2222300",
    hotline: "045-2222399",
    email: "ratnapura@sanasainsurance.lk",
    manager: "Mr. Bandula Wickramaratne",
    managerPhone: "077-0123456",
    hours: "Mon - Fri: 8:30 AM – 5:00 PM | Sat: 8:30 AM – 1:00 PM"
  },
  {
    id: "negombo",
    name: "Negombo Branch",
    province: "Western Province",
    district: "Gampaha",
    address: "No. 89, Main Street, Negombo",
    phone: "031-2224500",
    hotline: "031-2224599",
    email: "negombo@sanasainsurance.lk",
    manager: "Mr. Jude Perera",
    managerPhone: "077-1122334",
    hours: "Mon - Fri: 8:30 AM – 5:00 PM | Sat: 8:30 AM – 1:00 PM"
  },
  {
    id: "kalutara",
    name: "Kalutara Branch",
    province: "Western Province",
    district: "Kalutara",
    address: "No. 15, Galle Road, Kalutara North",
    phone: "034-2221200",
    hotline: "034-2221299",
    email: "kalutara@sanasainsurance.lk",
    manager: "Mr. Upul Silva",
    managerPhone: "077-2233445",
    hours: "Mon - Fri: 8:30 AM – 5:00 PM | Sat: 8:30 AM – 1:00 PM"
  },
  {
    id: "badulla",
    name: "Badulla Branch",
    province: "Uva Province",
    district: "Badulla",
    address: "No. 40, Lower Street, Badulla",
    phone: "055-2223400",
    hotline: "055-2223499",
    email: "badulla@sanasainsurance.lk",
    manager: "Mr. Sanjeewa Ratnayake",
    managerPhone: "077-3344556",
    hours: "Mon - Fri: 8:30 AM – 5:00 PM | Sat: 8:30 AM – 1:00 PM"
  },
  {
    id: "batticaloa",
    name: "Batticaloa Branch",
    province: "Eastern Province",
    district: "Batticaloa",
    address: "No. 76, Central Road, Batticaloa",
    phone: "065-2225600",
    hotline: "065-2225699",
    email: "batticaloa@sanasainsurance.lk",
    manager: "Mr. S. Sivanesan",
    managerPhone: "077-4455667",
    hours: "Mon - Fri: 8:30 AM – 5:00 PM | Sat: 8:30 AM – 1:00 PM"
  },
  {
    id: "embilipitiya",
    name: "Embilipitiya Branch",
    province: "Sabaragamuwa Province",
    district: "Ratnapura",
    address: "No. 18, Pallegama, Embilipitiya",
    phone: "047-2230100",
    hotline: "047-2230199",
    email: "embilipitiya@sanasainsurance.lk",
    manager: "Mr. Mahinda Alwis",
    managerPhone: "077-5566778",
    hours: "Mon - Fri: 8:30 AM – 5:00 PM | Sat: 8:30 AM – 1:00 PM"
  }
];

const HEAD_OFFICE_DEPTS = [
  {
    name: "Claims Assessment & Settlement Division",
    head: "Mr. Jagath Wijesinghe (Head of Claims)",
    phone: "+94 112 003 001",
    email: "claims@sanasainsurance.lk",
    extension: "Ext: 101 / 102",
    description: "24/7 Motor accident assessment coordination, on-site surveyors, claims verification, and settlement payouts."
  },
  {
    name: "Underwriting & Risk Engineering",
    head: "Mrs. Chithra Wickramasinghe",
    phone: "+94 112 003 002",
    email: "underwriting@sanasainsurance.lk",
    extension: "Ext: 201 / 202",
    description: "Motor, commercial fleet, micro-insurance policy evaluation, premium calculations, and risk underwriting."
  },
  {
    name: "IT Infrastructure, Core Systems & Security",
    head: "Mr. Asanka Ratnayake (CTO)",
    phone: "+94 112 003 003",
    email: "itsupport@sanasainsurance.lk",
    extension: "Ext: 301 / 302",
    description: "Cloud infrastructure, mobile agent apps, web portal support, server uptime, and database integrity."
  },
  {
    name: "Customer Experience & Dispute Resolution",
    head: "Ms. Nilanthi Jayawardena",
    phone: "+94 112 003 004",
    email: "customercare@sanasainsurance.lk",
    extension: "Ext: 401 / 402",
    description: "Policy holder grievances, general inquiries, feedback logging, and service satisfaction monitoring."
  },
  {
    name: "Legal, Compliance & Regulatory Affairs",
    head: "Mr. Samantha Perera (Legal Counsel)",
    phone: "+94 112 003 005",
    email: "legal@sanasainsurance.lk",
    extension: "Ext: 501 / 502",
    description: "Insurance Regulatory Commission of Sri Lanka (IRCSL) compliance, third-party recovery, and fraud audits."
  },
  {
    name: "Agency Network Operations & Field Support",
    head: "Mr. Roshan Gunasekara",
    phone: "+94 112 003 006",
    email: "agentoperations@sanasainsurance.lk",
    extension: "Ext: 601 / 602",
    description: "Island-wide agent onboarding, code activation, commission reconciliations, and field training."
  }
];

export default function AdminContactPage() {
  // Navigation tabs: 'inquiries' | 'branches' | 'headoffice' | 'compose'
  const [activeTab, setActiveTab] = useState<"inquiries" | "branches" | "headoffice" | "compose">("inquiries");

  // Admin session state
  const [loggedAdmin, setLoggedAdmin] = useState<any | null>(null);

  // Inquiries State
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loadingInquiries, setLoadingInquiries] = useState(true);
  const [inquirySearch, setInquirySearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [inquiryStats, setInquiryStats] = useState({ total: 0, pending: 0, inReview: 0, resolved: 0 });

  // Selected Inquiry for Modal & Reply
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [replyText, setReplyText] = useState("");
  const [adminNoteText, setAdminNoteText] = useState("");
  const [inquiryModalStatus, setInquiryModalStatus] = useState<"Pending" | "In Review" | "Resolved" | "Closed">("Pending");
  const [inquiryModalPriority, setInquiryModalPriority] = useState<"Normal" | "High" | "Urgent">("Normal");
  const [updatingInquiry, setUpdatingInquiry] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);

  // Branch Directory State
  const [branchSearch, setBranchSearch] = useState("");
  const [selectedProvince, setSelectedProvince] = useState("All");

  // Compose Email Dispatcher State
  const [composeForm, setComposeForm] = useState({
    targetGroup: "custom",
    specificEmail: "",
    subject: "",
    message: "",
    priority: "Normal"
  });
  const [sendingEmail, setSendingEmail] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Global popup / toast
  const [customPopup, setCustomPopup] = useState<{
    show: boolean;
    title: string;
    message: string;
    type?: "alert" | "confirm" | "success" | "error";
  }>({ show: false, title: "", message: "", type: "alert" });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const adminData = sessionStorage.getItem("logged_in_admin");
      if (!adminData) {
        window.location.href = "/Login";
        return;
      }
      try {
        const parsed = JSON.parse(adminData);
        setLoggedAdmin(parsed);
      } catch (e) {
        console.error("Failed to parse admin session", e);
        window.location.href = "/Login";
      }
    }
    loadInquiries();
  }, []);

  // Fetch support inquiries from backend
  const loadInquiries = async () => {
    try {
      setLoadingInquiries(true);
      const baseUrl = API_URL;
      const res = await fetch(`${baseUrl}/admin/contact/inquiries`);
      if (!res.ok) throw new Error("Failed to load inquiries.");
      const data = await res.json();
      setInquiries(data.inquiries || []);
      if (data.stats) {
        setInquiryStats(data.stats);
      }
    } catch (err: any) {
      console.error("Error loading inquiries:", err);
    } finally {
      setLoadingInquiries(false);
    }
  };

  // Open Inquiry Details Modal
  const handleOpenInquiryModal = (inq: Inquiry) => {
    setSelectedInquiry(inq);
    setReplyText("");
    setAdminNoteText(inq.adminNotes || "");
    setInquiryModalStatus(inq.status);
    setInquiryModalPriority(inq.priority);
  };

  // Update Inquiry Status & Internal Notes
  const handleSaveInquiryChanges = async () => {
    if (!selectedInquiry) return;
    setUpdatingInquiry(true);
    try {
      const baseUrl = API_URL;
      const res = await fetch(`${baseUrl}/admin/contact/inquiries/${selectedInquiry._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: inquiryModalStatus,
          priority: inquiryModalPriority,
          adminNotes: adminNoteText,
          resolvedBy: loggedAdmin?.name || "System Admin"
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update inquiry.");

      setInquiries(prev => prev.map(item => (item._id === selectedInquiry._id ? data.inquiry : item)));
      setSelectedInquiry(data.inquiry);

      setCustomPopup({
        show: true,
        title: "Inquiry Updated",
        message: `Ticket ${selectedInquiry.ticketId} status updated to ${inquiryModalStatus}.`,
        type: "success"
      });
      loadInquiries();
    } catch (err: any) {
      console.error(err);
      setCustomPopup({
        show: true,
        title: "Update Error",
        message: err.message || "Failed to update inquiry.",
        type: "error"
      });
    } finally {
      setUpdatingInquiry(false);
    }
  };

  // Send Direct Response Email to Inquiry Sender
  const handleSendInquiryReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInquiry) return;
    if (!replyText.trim()) {
      setCustomPopup({
        show: true,
        title: "Reply Required",
        message: "Please enter your response message before sending.",
        type: "alert"
      });
      return;
    }

    setSendingReply(true);
    try {
      const baseUrl = API_URL;
      const res = await fetch(`${baseUrl}/admin/contact/inquiries/${selectedInquiry._id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          replyMessage: replyText.trim(),
          adminName: loggedAdmin?.name || "Sanasa Insurance Administration"
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send reply.");

      setInquiries(prev => prev.map(item => (item._id === selectedInquiry._id ? data.inquiry : item)));
      setSelectedInquiry(data.inquiry);
      setReplyText("");

      setCustomPopup({
        show: true,
        title: "Official Response Dispatched",
        message: `Official response successfully sent to ${selectedInquiry.senderEmail}. Ticket marked as Resolved.`,
        type: "success"
      });
      loadInquiries();
    } catch (err: any) {
      console.error(err);
      setCustomPopup({
        show: true,
        title: "Send Error",
        message: err.message || "Failed to dispatch email reply.",
        type: "error"
      });
    } finally {
      setSendingReply(false);
    }
  };

  // Handle Compose Official Email
  const handleSendComposeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeForm.subject.trim() || !composeForm.message.trim()) {
      setCustomPopup({
        show: true,
        title: "Incomplete Fields",
        message: "Subject and message body are required.",
        type: "alert"
      });
      return;
    }

    if (composeForm.targetGroup === "custom" && !composeForm.specificEmail.trim()) {
      setCustomPopup({
        show: true,
        title: "Recipient Required",
        message: "Please enter a valid recipient email address.",
        type: "alert"
      });
      return;
    }

    setSendingEmail(true);
    try {
      const baseUrl = API_URL;
      const res = await fetch(`${baseUrl}/admin/contact/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...composeForm,
          senderName: loggedAdmin?.name || "System Admin"
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to dispatch communication.");

      setCustomPopup({
        show: true,
        title: "Communication Dispatched",
        message: data.message || "Email delivered successfully to the target recipient(s).",
        type: "success"
      });

      setComposeForm({
        targetGroup: "custom",
        specificEmail: "",
        subject: "",
        message: "",
        priority: "Normal"
      });
    } catch (err: any) {
      console.error(err);
      setCustomPopup({
        show: true,
        title: "Dispatch Failed",
        message: err.message || "Failed to send email.",
        type: "error"
      });
    } finally {
      setSendingEmail(false);
    }
  };

  // Quick action: pre-fill compose email for a specific branch
  const handleComposeForBranch = (branch: BranchContact) => {
    setComposeForm({
      targetGroup: "custom",
      specificEmail: branch.email,
      subject: `Executive Operational Circular — ${branch.name}`,
      message: `Dear ${branch.manager},\n\nPlease review the following operational directive for ${branch.name}:\n\n`,
      priority: "Normal"
    });
    setActiveTab("compose");
  };

  // Copy text to clipboard helper
  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Filtered inquiries
  const filteredInquiries = inquiries.filter(inq => {
    const matchesCategory = selectedCategory === "All" || inq.category === selectedCategory;
    const matchesStatus = selectedStatus === "All" || inq.status === selectedStatus;
    const q = inquirySearch.toLowerCase().trim();
    const matchesSearch =
      !q ||
      inq.ticketId.toLowerCase().includes(q) ||
      inq.senderName.toLowerCase().includes(q) ||
      inq.senderEmail.toLowerCase().includes(q) ||
      inq.subject.toLowerCase().includes(q) ||
      inq.message.toLowerCase().includes(q) ||
      (inq.branch && inq.branch.toLowerCase().includes(q));

    return matchesCategory && matchesStatus && matchesSearch;
  });

  // Filtered branches
  const filteredBranches = BRANCH_DIRECTORY.filter(br => {
    const matchesProvince = selectedProvince === "All" || br.province === selectedProvince;
    const q = branchSearch.toLowerCase().trim();
    const matchesSearch =
      !q ||
      br.name.toLowerCase().includes(q) ||
      br.manager.toLowerCase().includes(q) ||
      br.district.toLowerCase().includes(q) ||
      br.address.toLowerCase().includes(q) ||
      br.phone.includes(q);

    return matchesProvince && matchesSearch;
  });

  const allProvinces = [
    "All",
    "Western Province",
    "Southern Province",
    "Central Province",
    "North Western Province",
    "North Central Province",
    "Northern Province",
    "Eastern Province",
    "Sabaragamuwa Province",
    "Uva Province"
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-slate-800">
      <div className="flex flex-1 flex-row min-h-0">
        <AdminNavbar />

        <div className="flex-1 flex flex-col min-w-0 max-w-full overflow-x-hidden">
          {/* Header */}
          <header className="bg-white border-b border-slate-100 text-slate-800 px-6 lg:px-8 py-4 flex justify-between items-center select-none shadow-xs shrink-0 h-[80px] sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("open-admin-mobile-menu"))}
                className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 active:scale-95 transition-all cursor-pointer focus:outline-none"
              >
                <HugeiconsIcon icon={Menu01Icon} className="w-6 h-6" strokeWidth={2.5} />
              </button>
              <h1 className="lg:hidden text-lg font-bold text-slate-800 tracking-tight">
                Contact Hub
              </h1>
              <div className="hidden lg:flex items-center gap-3">
                <span className="bg-[#102A43] text-white text-xs px-3 py-1.5 rounded-lg font-semibold tracking-wide uppercase shadow-xs">
                  Admin Portal
                </span>
                <span className="text-slate-300 font-light">|</span>
                <span className="text-lg font-bold text-[#0f2d3a] tracking-tight">
                  Communications & Nationwide Contact Hub
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 text-xs font-semibold bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Direct Admin Line Active</span>
              </div>
              <UserAvatarDropdown userType="admin" />
            </div>
          </header>

          {/* Main Content Area */}
          <main className="flex-1 p-6 lg:p-8 bg-slate-50/70 flex flex-col gap-8 max-w-7xl mx-auto w-full pb-28">
            
            {/* Top KPI / Overview Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Card 1: Support Tickets */}
              <div 
                onClick={() => setActiveTab("inquiries")}
                className={`p-5 rounded-2xl bg-white border cursor-pointer transition-all duration-200 shadow-xs hover:shadow-md flex flex-col justify-between ${
                  activeTab === "inquiries" ? "border-blue-500 ring-2 ring-blue-500/10" : "border-slate-200/80 hover:border-blue-300"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Inbound Inquiries</span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-2xl font-extrabold text-[#0f2d3a]">{inquiryStats.total || inquiries.length}</span>
                      <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        {inquiryStats.pending} Pending
                      </span>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <HugeiconsIcon icon={Mail01Icon} className="w-5 h-5" strokeWidth={2} />
                  </div>
                </div>
                <div className="mt-3 text-[11px] font-semibold text-blue-600 flex items-center gap-1">
                  <span>Manage tickets & reply</span>
                  <HugeiconsIcon icon={ArrowRight01Icon} className="w-3.5 h-3.5" strokeWidth={2.5} />
                </div>
              </div>

              {/* Card 2: Branch Network */}
              <div 
                onClick={() => setActiveTab("branches")}
                className={`p-5 rounded-2xl bg-white border cursor-pointer transition-all duration-200 shadow-xs hover:shadow-md flex flex-col justify-between ${
                  activeTab === "branches" ? "border-blue-500 ring-2 ring-blue-500/10" : "border-slate-200/80 hover:border-blue-300"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Branch Directory</span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-2xl font-extrabold text-[#0f2d3a]">{BRANCH_DIRECTORY.length}</span>
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        9 Provinces
                      </span>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <HugeiconsIcon icon={Building01Icon} className="w-5 h-5" strokeWidth={2} />
                  </div>
                </div>
                <div className="mt-3 text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                  <span>View branch managers & contacts</span>
                  <HugeiconsIcon icon={ArrowRight01Icon} className="w-3.5 h-3.5" strokeWidth={2.5} />
                </div>
              </div>

              {/* Card 3: Head Office Executive Depts */}
              <div 
                onClick={() => setActiveTab("headoffice")}
                className={`p-5 rounded-2xl bg-white border cursor-pointer transition-all duration-200 shadow-xs hover:shadow-md flex flex-col justify-between ${
                  activeTab === "headoffice" ? "border-blue-500 ring-2 ring-blue-500/10" : "border-slate-200/80 hover:border-blue-300"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Head Office Divisions</span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-2xl font-extrabold text-[#0f2d3a]">6</span>
                      <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                        Claims & Ops
                      </span>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                    <HugeiconsIcon icon={SecurityCheckIcon} className="w-5 h-5" strokeWidth={2} />
                  </div>
                </div>
                <div className="mt-3 text-[11px] font-semibold text-purple-600 flex items-center gap-1">
                  <span>Executive & dept direct lines</span>
                  <HugeiconsIcon icon={ArrowRight01Icon} className="w-3.5 h-3.5" strokeWidth={2.5} />
                </div>
              </div>

              {/* Card 4: Official Communication Dispatcher */}
              <div 
                onClick={() => setActiveTab("compose")}
                className={`p-5 rounded-2xl bg-white border cursor-pointer transition-all duration-200 shadow-xs hover:shadow-md flex flex-col justify-between ${
                  activeTab === "compose" ? "border-blue-500 ring-2 ring-blue-500/10" : "border-slate-200/80 hover:border-blue-300"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Email Dispatcher</span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-2xl font-extrabold text-[#0f2d3a]">Direct</span>
                      <span className="text-xs font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-full border border-cyan-200">
                        Broadcast Ready
                      </span>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
                    <HugeiconsIcon icon={SentIcon} className="w-5 h-5" strokeWidth={2} />
                  </div>
                </div>
                <div className="mt-3 text-[11px] font-semibold text-cyan-600 flex items-center gap-1">
                  <span>Send official memo / circular</span>
                  <HugeiconsIcon icon={ArrowRight01Icon} className="w-3.5 h-3.5" strokeWidth={2.5} />
                </div>
              </div>

            </div>

            {/* Navigation Tabs Bar */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-0 gap-3 overflow-x-auto select-none no-scrollbar">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab("inquiries")}
                  className={`pb-3.5 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0 ${
                    activeTab === "inquiries"
                      ? "border-[#102A43] text-[#102A43]"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <HugeiconsIcon icon={Mail01Icon} className="w-4 h-4 shrink-0" strokeWidth={2} />
                  <span>Support Inquiries & Inbound Tickets</span>
                  {inquiryStats.pending > 0 && (
                    <span className="bg-amber-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full inline-flex items-center justify-center shrink-0 leading-none">
                      {inquiryStats.pending}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab("branches")}
                  className={`pb-3.5 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0 ${
                    activeTab === "branches"
                      ? "border-[#102A43] text-[#102A43]"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <HugeiconsIcon icon={Building01Icon} className="w-4 h-4 shrink-0" strokeWidth={2} />
                  <span>Nationwide Branch Directory</span>
                  <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200 inline-flex items-center justify-center shrink-0">
                    14
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab("headoffice")}
                  className={`pb-3.5 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0 ${
                    activeTab === "headoffice"
                      ? "border-[#102A43] text-[#102A43]"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <HugeiconsIcon icon={SecurityCheckIcon} className="w-4 h-4 shrink-0" strokeWidth={2} />
                  <span>Head Office Divisions & Hotlines</span>
                </button>

                <button
                  onClick={() => setActiveTab("compose")}
                  className={`pb-3.5 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0 ${
                    activeTab === "compose"
                      ? "border-[#102A43] text-[#102A43]"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <HugeiconsIcon icon={SentIcon} className="w-4 h-4 shrink-0" strokeWidth={2} />
                  <span>Send Official Communication</span>
                </button>
              </div>

              <div className="hidden xl:flex items-center gap-2 pb-3 text-xs text-slate-500 font-medium whitespace-nowrap shrink-0">
                <HugeiconsIcon icon={Clock01Icon} className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Head Office: Colombo 08 (24/7 Support)</span>
              </div>
            </div>

            {/* TAB 1: SUPPORT INQUIRIES & TICKETS */}
            {activeTab === "inquiries" && (
              <div className="flex flex-col gap-6 animate-fade-in">
                {/* Filters & Search Header */}
                <div className="bg-white p-4 lg:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
                  <div className="relative w-full md:w-96">
                    <HugeiconsIcon icon={Search01Icon} className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={inquirySearch}
                      onChange={(e) => setInquirySearch(e.target.value)}
                      placeholder="Search ticket ID, sender, email, subject..."
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
                    {/* Category Filter */}
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="All">All Categories</option>
                      <option value="Claims Escalation">Claims Escalation</option>
                      <option value="Technical Issue">Technical Issue</option>
                      <option value="Policy Inquiry">Policy Inquiry</option>
                      <option value="Agent Support">Agent Support</option>
                      <option value="Branch Operations">Branch Operations</option>
                      <option value="General Inquiry">General Inquiry</option>
                    </select>

                    {/* Status Filter */}
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="All">All Statuses</option>
                      <option value="Pending">Pending</option>
                      <option value="In Review">In Review</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Closed">Closed</option>
                    </select>

                    <button
                      onClick={loadInquiries}
                      title="Refresh inquiries"
                      className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 active:scale-95 transition-all cursor-pointer"
                    >
                      <HugeiconsIcon icon={RefreshIcon} className={`w-4 h-4 ${loadingInquiries ? 'animate-spin' : ''}`} strokeWidth={2} />
                    </button>
                  </div>
                </div>

                {/* Inquiries List / Table Card */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                  {loadingInquiries ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-3">
                      <SimpleLoader />
                      <span className="text-xs font-semibold text-slate-400">Loading support inquiries...</span>
                    </div>
                  ) : filteredInquiries.length === 0 ? (
                    <div className="py-16 text-center flex flex-col items-center justify-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center border border-slate-100">
                        <HugeiconsIcon icon={Mail01Icon} className="w-6 h-6" strokeWidth={1.5} />
                      </div>
                      <h4 className="text-sm font-bold text-slate-700">No Inquiries Found</h4>
                      <p className="text-xs text-slate-400 max-w-sm">
                        No support tickets match the selected category or search filters.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-bold select-none">
                            <th className="py-4 px-6 whitespace-nowrap text-left min-w-[130px]">Ticket ID</th>
                            <th className="py-4 px-6 whitespace-nowrap text-left min-w-[180px]">Sender Details</th>
                            <th className="py-4 px-6 text-left min-w-[260px]">Category & Subject</th>
                            <th className="py-4 px-6 whitespace-nowrap text-left min-w-[140px]">Branch</th>
                            <th className="py-4 px-6 whitespace-nowrap text-center min-w-[100px]">Priority</th>
                            <th className="py-4 px-6 whitespace-nowrap text-center min-w-[110px]">Status</th>
                            <th className="py-4 px-6 whitespace-nowrap text-right min-w-[130px]">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredInquiries.map((inq) => (
                            <tr key={inq._id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-4 px-6 whitespace-nowrap font-mono font-bold text-slate-800 text-xs">
                                {inq.ticketId}
                              </td>
                              <td className="py-4 px-6 whitespace-nowrap">
                                <div className="font-bold text-slate-900 text-xs">{inq.senderName}</div>
                                <div className="text-[11px] text-slate-500 font-medium mt-0.5 flex items-center gap-1.5">
                                  <span>{inq.senderEmail}</span>
                                  {inq.senderPhone && <span className="text-slate-400">• {inq.senderPhone}</span>}
                                </div>
                                <span className="inline-block mt-1.5 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200/60">
                                  {inq.senderRole}
                                </span>
                              </td>
                              <td className="py-4 px-6 min-w-[260px] max-w-sm">
                                <span className="inline-block mb-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100 whitespace-nowrap">
                                  {inq.category}
                                </span>
                                <div className="font-bold text-slate-800 text-xs truncate max-w-xs" title={inq.subject}>
                                  {inq.subject}
                                </div>
                                <div className="text-[11px] text-slate-500 truncate max-w-xs mt-0.5" title={inq.message}>
                                  {inq.message}
                                </div>
                              </td>
                              <td className="py-4 px-6 whitespace-nowrap font-semibold text-slate-700 text-xs">
                                {inq.branch || "Head Office"}
                              </td>
                              <td className="py-4 px-6 text-center whitespace-nowrap">
                                <span className={`inline-flex items-center justify-center whitespace-nowrap text-[10px] font-bold uppercase px-3 py-1 rounded-full border ${
                                  inq.priority === "Urgent"
                                    ? "bg-red-50 text-red-700 border-red-200 animate-pulse"
                                    : inq.priority === "High"
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : "bg-blue-50 text-blue-700 border-blue-200"
                                }`}>
                                  {inq.priority}
                                </span>
                              </td>
                              <td className="py-4 px-6 text-center whitespace-nowrap">
                                <span className={`inline-flex items-center justify-center whitespace-nowrap text-[10px] font-bold uppercase px-3.5 py-1 rounded-full border ${
                                  inq.status === "Resolved"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : inq.status === "In Review"
                                    ? "bg-sky-50 text-sky-700 border-sky-200"
                                    : inq.status === "Closed"
                                    ? "bg-slate-100 text-slate-500 border-slate-200"
                                    : "bg-amber-50 text-amber-700 border-amber-200"
                                }`}>
                                  {inq.status}
                                </span>
                              </td>
                              <td className="py-4 px-6 text-right whitespace-nowrap">
                                <button
                                  onClick={() => handleOpenInquiryModal(inq)}
                                  className="px-5 py-2 bg-[#102A43] hover:bg-[#0f2d3a] active:scale-95 text-white rounded-full text-xs font-semibold transition-all cursor-pointer shadow-xs whitespace-nowrap"
                                >
                                  View & Reply
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: NATIONWIDE BRANCH DIRECTORY */}
            {activeTab === "branches" && (
              <div className="flex flex-col gap-6 animate-fade-in">
                {/* Search & Province Filter Bar */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
                  <div className="relative w-full md:w-96">
                    <HugeiconsIcon icon={Search01Icon} className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={branchSearch}
                      onChange={(e) => setBranchSearch(e.target.value)}
                      placeholder="Search branch name, manager, town, phone..."
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    />
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                    <select
                      value={selectedProvince}
                      onChange={(e) => setSelectedProvince(e.target.value)}
                      className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      {allProvinces.map((prov) => (
                        <option key={prov} value={prov}>
                          {prov === "All" ? "All 9 Provinces" : prov}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Branches Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredBranches.map((branch) => (
                    <div
                      key={branch.id}
                      className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 p-6 flex flex-col justify-between gap-5 group"
                    >
                      <div>
                        {/* Card Header */}
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100 inline-block mb-1.5">
                              {branch.province}
                            </span>
                            <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                              {branch.name}
                            </h3>
                          </div>
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 mt-1" title="Branch Online" />
                        </div>

                        {/* Location */}
                        <div className="flex items-start gap-2 text-xs text-slate-600 mb-4">
                          <HugeiconsIcon icon={Location01Icon} className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                          <span className="leading-relaxed">{branch.address}</span>
                        </div>

                        {/* Contact Meta */}
                        <div className="bg-slate-50 rounded-xl p-3.5 flex flex-col gap-2.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Branch Hotline:</span>
                            <a href={`tel:${branch.phone}`} className="font-semibold text-slate-800 hover:text-blue-600 no-underline">
                              {branch.phone}
                            </a>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Official Email:</span>
                            <span className="font-semibold text-slate-800 text-[11px] truncate max-w-[160px]" title={branch.email}>
                              {branch.email}
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Branch Manager:</span>
                            <div className="text-right">
                              <div className="font-bold text-slate-900">{branch.manager}</div>
                              <div className="text-[10px] text-slate-500">{branch.managerPhone}</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="pt-2 flex items-center gap-2 border-t border-slate-100 select-none">
                        <button
                          onClick={() => handleComposeForBranch(branch)}
                          className="flex-1 py-2.5 bg-[#102A43] hover:bg-[#0f2d3a] active:scale-95 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                        >
                          <HugeiconsIcon icon={Mail01Icon} className="w-3.5 h-3.5" />
                          <span>Email Branch</span>
                        </button>
                        <button
                          onClick={() => handleCopyText(`${branch.name}\n${branch.address}\nPhone: ${branch.phone}\nEmail: ${branch.email}\nManager: ${branch.manager} (${branch.managerPhone})`, branch.id)}
                          title="Copy branch contact information"
                          className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 border border-slate-200"
                        >
                          <HugeiconsIcon icon={Copy01Icon} className="w-3.5 h-3.5" />
                          <span>{copiedKey === branch.id ? "Copied!" : "Copy"}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: HEAD OFFICE EXECUTIVE DIRECTORY */}
            {activeTab === "headoffice" && (
              <div className="flex flex-col gap-6 animate-fade-in">
                {/* Emergency Hotlines Card */}
                <div className="bg-gradient-to-r from-[#102A43] to-[#0f2d3a] rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
                  <div>
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-widest bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20 mb-3 inline-block">
                      24/7 Island-Wide Emergency Lines
                    </span>
                    <h2 className="text-2xl font-bold tracking-tight text-white mt-1">
                      Sanasa General Insurance Corporate Command
                    </h2>
                    <p className="text-slate-300 text-xs font-normal mt-2 max-w-xl leading-relaxed">
                      Main switchboard, claims towing emergency dispatch, IT cybersecurity escalation, and national executive headquarters.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <a
                      href="tel:+94112003000"
                      className="px-6 py-3.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg transition-all no-underline active:scale-95"
                    >
                      <HugeiconsIcon icon={Call02Icon} className="w-4 h-4 text-slate-950" strokeWidth={2.5} />
                      <span>+94 112 003 000 (24h)</span>
                    </a>
                    <a
                      href="mailto:headoffice@sanasainsurance.lk"
                      className="px-6 py-3.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold rounded-2xl text-xs flex items-center justify-center gap-2 transition-all no-underline active:scale-95"
                    >
                      <HugeiconsIcon icon={Mail01Icon} className="w-4 h-4" />
                      <span>headoffice@sanasainsurance.lk</span>
                    </a>
                  </div>
                </div>

                {/* Head Office Departments Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {HEAD_OFFICE_DEPTS.map((dept, idx) => (
                    <div
                      key={idx}
                      className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            {dept.extension}
                          </span>
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        </div>

                        <h3 className="text-base font-bold text-slate-900 mb-2 leading-snug">
                          {dept.name}
                        </h3>

                        <p className="text-xs text-slate-500 leading-relaxed mb-4">
                          {dept.description}
                        </p>

                        <div className="bg-slate-50 rounded-xl p-3.5 flex flex-col gap-2 text-xs">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Division Head:</span>
                            <span className="font-bold text-slate-800">{dept.head}</span>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Direct Line:</span>
                            <a href={`tel:${dept.phone}`} className="font-semibold text-blue-600 no-underline">
                              {dept.phone}
                            </a>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Official Email:</span>
                            <a href={`mailto:${dept.email}`} className="font-semibold text-slate-700 hover:text-blue-600 text-[11px] no-underline">
                              {dept.email}
                            </a>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setComposeForm({
                            targetGroup: "custom",
                            specificEmail: dept.email,
                            subject: `Admin Internal Memo — ${dept.name}`,
                            message: `Dear ${dept.head},\n\n`,
                            priority: "Normal"
                          });
                          setActiveTab("compose");
                        }}
                        className="w-full py-2.5 bg-slate-100 hover:bg-[#102A43] hover:text-white text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-slate-200 active:scale-95"
                      >
                        <HugeiconsIcon icon={Mail01Icon} className="w-3.5 h-3.5" />
                        <span>Send Internal Memo</span>
                      </button>
                    </div>
                  ))}
                </div>

                {/* Head Office Physical Location Card */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <HugeiconsIcon icon={Location01Icon} className="w-6 h-6" strokeWidth={2} />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-slate-900">Sanasa General Insurance Corporate Tower</h4>
                      <p className="text-xs text-slate-600 mt-1">
                        No: 172, Elvitigala Mawatha, Colombo 08, Western Province, Sri Lanka
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Open Hours: Monday – Friday 8:30 AM to 5:15 PM (Closed on public holidays & Sundays)
                      </p>
                    </div>
                  </div>

                  <a
                    href="https://maps.google.com/?q=No+172+Elvitigala+Mawatha+Colombo+8"
                    target="_blank"
                    rel="noreferrer"
                    className="px-6 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl text-xs transition-all no-underline shrink-0 border border-blue-200 active:scale-95"
                  >
                    Open in Google Maps
                  </a>
                </div>
              </div>
            )}

            {/* TAB 4: SEND OFFICIAL COMMUNICATION */}
            {activeTab === "compose" && (
              <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full animate-fade-in">
                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-8 text-left">
                  
                  {/* Header */}
                  <div className="border-b border-slate-100 pb-5 mb-6">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <HugeiconsIcon icon={SentIcon} className="w-5 h-5" strokeWidth={2} />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-slate-900 tracking-tight leading-none">
                          Official Administrative Email Dispatcher
                        </h2>
                        <p className="text-xs text-slate-400 font-medium mt-1">
                          Transmit official administrative notices, claims circulars, or direct correspondence with official letterhead.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSendComposeEmail} className="flex flex-col gap-6">
                    
                    {/* Target Recipient Selector */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Target Recipient Group <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={composeForm.targetGroup}
                          onChange={(e) => setComposeForm({ ...composeForm, targetGroup: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="custom">Custom Email Address</option>
                          <option value="all_branches">All Branch Offices (Broadcast to 14 Branches)</option>
                          <option value="all_agents">All Active Registered Agents (Broadcast)</option>
                          <optgroup label="Specific Branch Office">
                            {BRANCH_DIRECTORY.map((b) => (
                              <option key={b.id} value={`branch_${b.name.replace(" Branch", "")}`}>
                                {b.name} ({b.manager})
                              </option>
                            ))}
                          </optgroup>
                        </select>
                      </div>

                      {/* Specific Email Input if custom */}
                      {composeForm.targetGroup === "custom" && (
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            Recipient Email Address <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="email"
                            required
                            value={composeForm.specificEmail}
                            onChange={(e) => setComposeForm({ ...composeForm, specificEmail: e.target.value })}
                            placeholder="recipient@sanasainsurance.lk"
                            className="w-full px-4 py-3 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      )}

                      {/* Priority Selector if not custom (or keep in 2 cols) */}
                      {composeForm.targetGroup !== "custom" && (
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            Priority Level
                          </label>
                          <select
                            value={composeForm.priority}
                            onChange={(e) => setComposeForm({ ...composeForm, priority: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="Normal">Normal Priority</option>
                            <option value="High">High Priority</option>
                            <option value="Urgent">Urgent Operational Alert</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {composeForm.targetGroup === "custom" && (
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Priority Level
                        </label>
                        <div className="flex items-center gap-3">
                          {["Normal", "High", "Urgent"].map((p) => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => setComposeForm({ ...composeForm, priority: p })}
                              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                composeForm.priority === p
                                  ? p === "Urgent"
                                    ? "bg-red-50 text-red-700 border-red-300 ring-2 ring-red-200"
                                    : p === "High"
                                    ? "bg-amber-50 text-amber-700 border-amber-300 ring-2 ring-amber-200"
                                    : "bg-blue-50 text-blue-700 border-blue-300 ring-2 ring-blue-200"
                                  : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              {p} Priority
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quick Template Presets */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Quick Template Shortcuts
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          {
                            label: "System Maintenance Notice",
                            subject: "Scheduled IT Core System Maintenance Notice",
                            body: "Please be advised that the core claims portal will undergo scheduled maintenance this Sunday between 01:00 AM and 04:00 AM. Services will resume immediately following the update."
                          },
                          {
                            label: "Claims Policy Guideline Update",
                            subject: "Updated Motor Accident Assessment Guidelines — Q3 2026",
                            body: "All branch claims assessors and office managers are required to comply with the revised photographic assessment guidelines effective 1st of next month."
                          },
                          {
                            label: "Agent Commission Settlement",
                            subject: "Monthly Agent Commission Cycle Reconciliation Notice",
                            body: "The monthly commission reconciliation cycle for registered branch agents has been processed. Please review your branch statements."
                          }
                        ].map((tmpl, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setComposeForm({ ...composeForm, subject: tmpl.subject, message: tmpl.body })}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold rounded-lg transition-all cursor-pointer border border-slate-200"
                          >
                            + {tmpl.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Subject */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Email Subject <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={composeForm.subject}
                        onChange={(e) => setComposeForm({ ...composeForm, subject: e.target.value })}
                        placeholder="Enter email subject line..."
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Message Body */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Message Body <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        required
                        rows={7}
                        value={composeForm.message}
                        onChange={(e) => setComposeForm({ ...composeForm, message: e.target.value })}
                        placeholder="Type the message body here. This will be formatted automatically with the official Sanasa Insurance letterhead..."
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 text-xs font-normal text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y leading-relaxed font-sans"
                      />
                    </div>

                    {/* Dispatch Action */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <div className="text-[11px] text-slate-400 font-medium">
                        Sender: <strong className="text-slate-700">{loggedAdmin?.name || "System Admin"}</strong> (Sanasa Insurance PLC)
                      </div>
                      <button
                        type="submit"
                        disabled={sendingEmail}
                        className="px-8 py-3 bg-[#102A43] hover:bg-[#0f2d3a] active:scale-95 text-white rounded-full text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-60"
                      >
                        {sendingEmail ? (
                          <>
                            <HugeiconsIcon icon={Loading03Icon} className="w-4 h-4 animate-spin text-white" />
                            <span>Dispatching Email...</span>
                          </>
                        ) : (
                          <>
                            <HugeiconsIcon icon={SentIcon} className="w-4 h-4" strokeWidth={2} />
                            <span>Dispatch Official Email</span>
                          </>
                        )}
                      </button>
                    </div>

                  </form>
                </div>
              </div>
            )}

          </main>
        </div>
      </div>

      {/* VIEW & REPLY INQUIRY MODAL */}
      {selectedInquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-100 overflow-hidden transform scale-100 transition-all animate-scale-up max-h-[90vh] flex flex-col text-left">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center px-8 pt-6 pb-4 border-b border-slate-100 shrink-0 bg-white select-none">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-xs font-extrabold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-100">
                    {selectedInquiry.ticketId}
                  </span>
                  <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                    selectedInquiry.status === "Resolved"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : selectedInquiry.status === "In Review"
                      ? "bg-sky-50 text-sky-700 border-sky-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}>
                    {selectedInquiry.status}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-2">
                  {selectedInquiry.subject}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInquiry(null)}
                className="text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer p-1"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" strokeWidth={2.5} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8 overflow-y-auto flex-1 flex flex-col gap-6">
              
              {/* Sender Details Grid */}
              <div className="bg-slate-50 rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs border border-slate-200/60">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sender Name</span>
                  <span className="font-bold text-slate-800">{selectedInquiry.senderName}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sender Role</span>
                  <span className="font-semibold text-slate-700">{selectedInquiry.senderRole}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email Address</span>
                  <span className="font-semibold text-slate-700 truncate block">{selectedInquiry.senderEmail}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Phone / Branch</span>
                  <span className="font-semibold text-slate-700">{selectedInquiry.senderPhone || "-"} • {selectedInquiry.branch || "HO"}</span>
                </div>
              </div>

              {/* Inquiry Message Body */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Original Inbound Message</span>
                <div className="p-4 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs leading-relaxed whitespace-pre-line font-medium shadow-xs">
                  {selectedInquiry.message}
                </div>
              </div>

              {/* Status & Priority Controller */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ticket Status</label>
                  <select
                    value={inquiryModalStatus}
                    onChange={(e) => setInquiryModalStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Review">In Review</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ticket Priority</label>
                  <select
                    value={inquiryModalPriority}
                    onChange={(e) => setInquiryModalPriority(e.target.value as any)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Internal Admin Notes */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Internal Admin Notes (Private)</label>
                <textarea
                  rows={2}
                  value={adminNoteText}
                  onChange={(e) => setAdminNoteText(e.target.value)}
                  placeholder="Add internal investigation notes or department assignment details..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={updatingInquiry}
                    onClick={handleSaveInquiryChanges}
                    className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition-all cursor-pointer border border-slate-300"
                  >
                    {updatingInquiry ? "Saving Notes..." : "Save Status & Notes"}
                  </button>
                </div>
              </div>

              {/* Previous Reply if any */}
              {selectedInquiry.replyMessage && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Official Response Sent</span>
                    <span className="text-[10px] text-emerald-600">{selectedInquiry.repliedBy || "Admin"}</span>
                  </div>
                  <p className="text-emerald-950 font-medium whitespace-pre-line leading-relaxed">
                    {selectedInquiry.replyMessage}
                  </p>
                </div>
              )}

              {/* Compose Reply Form */}
              <form onSubmit={handleSendInquiryReply} className="flex flex-col gap-3 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <HugeiconsIcon icon={Mail01Icon} className="w-4 h-4 text-blue-600" />
                    <span>Send Official Email Response</span>
                  </label>
                  <span className="text-[10px] text-slate-400">To: {selectedInquiry.senderEmail}</span>
                </div>

                <textarea
                  rows={4}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Write your response to ${selectedInquiry.senderName}. This will be emailed directly to ${selectedInquiry.senderEmail}...`}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 text-xs font-normal text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none leading-relaxed"
                />

                <div className="flex justify-end gap-3 select-none">
                  <button
                    type="button"
                    onClick={() => setSelectedInquiry(null)}
                    className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-full text-xs font-semibold transition-all cursor-pointer bg-white"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={sendingReply || !replyText.trim()}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-full text-xs font-bold shadow-md transition-all cursor-pointer border-none flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {sendingReply ? (
                      <>
                        <HugeiconsIcon icon={Loading03Icon} className="w-4 h-4 animate-spin text-white" />
                        <span>Sending Reply...</span>
                      </>
                    ) : (
                      <>
                        <HugeiconsIcon icon={SentIcon} className="w-4 h-4 text-white" strokeWidth={2} />
                        <span>Send Response & Mark Resolved</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

            </div>
          </div>
        </div>
      )}

      {/* CUSTOM POPUP MODAL */}
      {customPopup.show && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border border-slate-100 overflow-hidden transform scale-100 transition-all animate-scale-up text-left p-6 flex flex-col gap-4">
            
            <div className="flex items-center gap-3.5">
              {customPopup.type === "success" ? (
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-5 h-5 text-emerald-600" strokeWidth={2.5} />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                  <HugeiconsIcon icon={Alert02Icon} className="w-5 h-5 text-red-500" strokeWidth={2.5} />
                </div>
              )}
              <h3 className="font-bold text-base text-slate-800 tracking-tight leading-none">
                {customPopup.title}
              </h3>
            </div>

            <div>
              <p className="text-slate-500 text-xs font-semibold leading-relaxed">
                {customPopup.message}
              </p>
            </div>

            <div className="flex justify-end gap-2.5 mt-2 select-none">
              <button
                onClick={() => setCustomPopup({ ...customPopup, show: false })}
                className="px-6 py-2 bg-[#102A43] hover:bg-[#0f2d3a] active:scale-95 text-white rounded-full text-xs font-bold shadow-md transition-all cursor-pointer border-none"
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
