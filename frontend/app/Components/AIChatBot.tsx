"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ChatBotIcon,
  Cancel01Icon,
  SentIcon,
  Delete02Icon,
} from "@hugeicons/core-free-icons";
import { API_URL } from "../config";

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
}

type UserRole = "guest" | "policy_holder" | "agent" | "office_staff" | "admin";

interface QuickPrompt {
  label: string;
  text: string;
  colorClass: string;
}

const PROMPTS_BY_ROLE: Record<UserRole, QuickPrompt[]> = {
  guest: [
    {
      label: "🛡️ Comprehensive Cover",
      text: "What does Sanasa Comprehensive Motor Insurance cover?",
      colorClass: "bg-sky-50/90 hover:bg-sky-100 text-sky-700 border-sky-200",
    },
    {
      label: "🚗 Third-Party Only",
      text: "What is covered under Third Party Motor Insurance in Sri Lanka?",
      colorClass: "bg-emerald-50/90 hover:bg-emerald-100 text-emerald-700 border-emerald-200",
    },
    {
      label: "📋 How to File a Claim",
      text: "What is the step-by-step procedure to report an accident and file a claim?",
      colorClass: "bg-rose-50/90 hover:bg-rose-100 text-rose-700 border-rose-200",
    },
    {
      label: "📄 Required Claim Documents",
      text: "What documents are required to claim motor insurance?",
      colorClass: "bg-indigo-50/90 hover:bg-indigo-100 text-indigo-700 border-indigo-200",
    },
    {
      label: "🚨 24/7 Accident Hotline",
      text: "What is the 24/7 Sanasa emergency accident hotline?",
      colorClass: "bg-teal-50/90 hover:bg-teal-100 text-teal-700 border-teal-200",
    },
    {
      label: "🏢 Sanasa Branches",
      text: "Where are Sanasa General Insurance branch offices located?",
      colorClass: "bg-amber-50/90 hover:bg-amber-100 text-amber-700 border-amber-200",
    },
  ],
  policy_holder: [
    {
      label: "📋 What are my claims?",
      text: "What are my registered claims?",
      colorClass: "bg-sky-50/90 hover:bg-sky-100 text-sky-700 border-sky-200",
    },
    {
      label: "🚗 My Registered Vehicles",
      text: "What are my registered vehicles?",
      colorClass: "bg-emerald-50/90 hover:bg-emerald-100 text-emerald-700 border-emerald-200",
    },
    {
      label: "👤 My Profile Details",
      text: "What are my registered profile details?",
      colorClass: "bg-violet-50/90 hover:bg-violet-100 text-violet-700 border-violet-200",
    },
    {
      label: "🚗 File Accident Claim",
      text: "How do I file a vehicle accident claim step-by-step?",
      colorClass: "bg-rose-50/90 hover:bg-rose-100 text-rose-700 border-rose-200",
    },
    {
      label: "📄 Document Checklist",
      text: "What documents do I need to submit for my claim?",
      colorClass: "bg-indigo-50/90 hover:bg-indigo-100 text-indigo-700 border-indigo-200",
    },
    {
      label: "🚨 24/7 Hotline",
      text: "What is the 24/7 Sanasa emergency accident hotline?",
      colorClass: "bg-teal-50/90 hover:bg-teal-100 text-teal-700 border-teal-200",
    },
  ],
  agent: [
    {
      label: "📋 Inspection Checklist",
      text: "What is the on-site physical inspection checklist and procedure?",
      colorClass: "bg-sky-50/90 hover:bg-sky-100 text-sky-700 border-sky-200",
    },
    {
      label: "📸 Mandatory Inspection Photos",
      text: "What photos must an agent take during accident damage inspection?",
      colorClass: "bg-emerald-50/90 hover:bg-emerald-100 text-emerald-700 border-emerald-200",
    },
    {
      label: "🛠️ Garage Estimate Verification",
      text: "How do I cross-check garage repair estimate quotations?",
      colorClass: "bg-amber-50/90 hover:bg-amber-100 text-amber-700 border-amber-200",
    },
    {
      label: "📝 Physical Report Guidelines",
      text: "What remarks and component damage details are needed in the inspection report?",
      colorClass: "bg-indigo-50/90 hover:bg-indigo-100 text-indigo-700 border-indigo-200",
    },
    {
      label: "🚨 Emergency Claims Desk",
      text: "How do I contact the head office emergency claims desk?",
      colorClass: "bg-rose-50/90 hover:bg-rose-100 text-rose-700 border-rose-200",
    },
  ],
  office_staff: [
    {
      label: "👤 Policyholder Lookup",
      text: "Show policyholder details, registered vehicles, and document status for NIC",
      colorClass: "bg-sky-50/90 hover:bg-sky-100 text-sky-700 border-sky-200",
    },
    {
      label: "🚗 Vehicle & Policy Search",
      text: "Search vehicle details, insurance policy number, and registration documents",
      colorClass: "bg-emerald-50/90 hover:bg-emerald-100 text-emerald-700 border-emerald-200",
    },
    {
      label: "📋 Claims & Document Checklist",
      text: "Show active branch claims, assigned agents, and uploaded document checklist",
      colorClass: "bg-indigo-50/90 hover:bg-indigo-100 text-indigo-700 border-indigo-200",
    },
    {
      label: "👷 Field Agent Workloads",
      text: "List branch field agents and their currently assigned claim workloads",
      colorClass: "bg-amber-50/90 hover:bg-amber-100 text-amber-700 border-amber-200",
    },
  ],
  admin: [
    {
      label: "👥 Policyholders & Vehicles",
      text: "Look up policyholder public records, registered vehicles, and document verification status",
      colorClass: "bg-sky-50/90 hover:bg-sky-100 text-sky-700 border-sky-200",
    },
    {
      label: "📋 System Claims & Estimates",
      text: "Show recent motor claims, damage categories, and agent inspection reports",
      colorClass: "bg-emerald-50/90 hover:bg-emerald-100 text-emerald-700 border-emerald-200",
    },
    {
      label: "👷 Agent Roster & Workload",
      text: "List active agents across branches and their claim inspection status",
      colorClass: "bg-indigo-50/90 hover:bg-indigo-100 text-indigo-700 border-indigo-200",
    },
    {
      label: "🔒 Sensitive Data Rules",
      text: "What customer sensitive data is protected and excluded from AI agent inquiries?",
      colorClass: "bg-rose-50/90 hover:bg-rose-100 text-rose-700 border-rose-200",
    },
  ],
};

const getInitialWelcome = (role: UserRole, name?: string): ChatMessage[] => {
  const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  if (role === "guest") {
    return [
      {
        id: "welcome-guest",
        sender: "ai",
        text: "Hello! I am **Sanasa AI**, your official Vehicle & Motor Insurance assistant.\n\nI can provide general information on:\n• Comprehensive & Third-Party insurance policies\n• Step-by-step accident claim procedures & documents\n• 24/7 emergency roadside assistance across Sri Lanka\n• Sanasa branch locations & customer service\n\nHow can I help you today?",
        timestamp: time,
      },
    ];
  }

  if (role === "policy_holder") {
    return [
      {
        id: "welcome-policy",
        sender: "ai",
        text: `Hello${name ? ` **${name}**` : ""}! I am your personal **Sanasa Policyholder Assistant**.\n\nI can help you with:\n• Checking your active and past claims\n• Viewing registered insured vehicles & policy numbers\n• Step-by-step guidance on filing a new accident claim\n• 24/7 roadside emergency hotline\n\nWhat would you like to check today?`,
        timestamp: time,
      },
    ];
  }

  if (role === "agent") {
    return [
      {
        id: "welcome-agent",
        sender: "ai",
        text: `Hello${name ? ` **${name}**` : ""}! I am the **Sanasa Agent Field Assistant**.\n\nI can assist you with:\n• On-site vehicle inspection standards & checklist\n• Mandatory photo evidence requirements\n• Garage estimate assessments\n• Reporting and submission workflows\n\nHow can I support your field assessment today?`,
        timestamp: time,
      },
    ];
  }

  if (role === "office_staff") {
    return [
      {
        id: "welcome-staff",
        sender: "ai",
        text: `Hello${name ? ` **${name}**` : ""}! I am the **Sanasa Branch Operations Assistant**.\n\nI can assist you with:\n• **Policyholders**: Look up public records, contact info, and document status by NIC or name\n• **Vehicles**: Check vehicle specifications, policy numbers, and renewal dates\n• **Claims**: View claim dossiers, assigned field agents, and damage details\n• **Documents**: Check upload status of NIC, Vehicle Registration (CR), Revenue License, & estimates\n• **Field Agents**: View active agents in your branch and their assigned claim workloads\n\n*(Note: Sensitive credentials such as passwords and full bank account numbers are strictly protected)*\n\nWhat would you like to review or look up today?`,
        timestamp: time,
      },
    ];
  }

  return [
    {
      id: "welcome-admin",
      sender: "ai",
      text: "Hello Administrator! I am the **Sanasa Admin Operations Assistant**.\n\nI can assist you with:\n• **Policyholder Inquiries**: Public profiles, registered vehicles, and verification documents\n• **Vehicle Records**: Specifications, insurance policy numbers, and renewal statuses\n• **System Claims**: Claim dossiers, damage types, assessed amounts, and assigned officers\n• **Field Agents**: Nationwide agent roster, availability, and active claim workloads\n• **Document Auditing**: Verification status of registration certificates, licenses, and inspection reports\n\n*(Note: Security credentials such as passwords and unmasked bank accounts are strictly protected)*\n\nHow can I help you today?",
      timestamp: time,
    },
  ];
};

export default function WebAIChatBot() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Role and authenticated user context state
  const [currentRole, setCurrentRole] = useState<UserRole>("guest");
  const [userInfo, setUserInfo] = useState<{ name: string; nic: string; email: string; branch: string }>({
    name: "",
    nic: "",
    email: "",
    branch: "",
  });

  // Independent chat history per role to ensure 100% privacy and separation
  const [threads, setThreads] = useState<Record<UserRole, ChatMessage[]>>({
    guest: getInitialWelcome("guest"),
    policy_holder: getInitialWelcome("policy_holder"),
    agent: getInitialWelcome("agent"),
    office_staff: getInitialWelcome("office_staff"),
    admin: getInitialWelcome("admin"),
  });

  // Detect role and logged-in user on pathname/mount change
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (pathname?.includes("/Policy_Holder/")) {
      let uName = "Policyholder";
      let uNic = "";
      let uEmail = "";
      try {
        const uStr = sessionStorage.getItem("logged_in_user");
        if (uStr) {
          const u = JSON.parse(uStr);
          uName = u.firstName ? `${u.firstName} ${u.lastName || ""}`.trim() : "Policyholder";
          uNic = u.nic || "";
          uEmail = u.email || "";
        }
      } catch {}
      setCurrentRole("policy_holder");
      setUserInfo({ name: uName, nic: uNic, email: uEmail, branch: "" });
      setThreads((prev) => ({
        ...prev,
        policy_holder: prev.policy_holder.length > 0 ? prev.policy_holder : getInitialWelcome("policy_holder", uName),
      }));
    } else if (pathname?.includes("/Agent/")) {
      let aName = "Agent";
      let aNic = "";
      let aEmail = "";
      let aBranch = "";
      try {
        const aStr = sessionStorage.getItem("logged_in_agent");
        if (aStr) {
          const a = JSON.parse(aStr);
          aName = a.name || "Agent";
          aNic = a.nic || "";
          aEmail = a.email || "";
          aBranch = a.branch || "";
        }
      } catch {}
      setCurrentRole("agent");
      setUserInfo({ name: aName, nic: aNic, email: aEmail, branch: aBranch });
      setThreads((prev) => ({
        ...prev,
        agent: prev.agent.length > 0 ? prev.agent : getInitialWelcome("agent", aName),
      }));
    } else if (pathname?.includes("/Office_Staff/")) {
      let sName = "Staff Officer";
      let sNic = "";
      let sEmail = "";
      let sBranch = "";
      try {
        const sStr = sessionStorage.getItem("logged_in_staff");
        if (sStr) {
          const s = JSON.parse(sStr);
          sName = s.name || "Staff Officer";
          sNic = s.nic || "";
          sEmail = s.email || "";
          sBranch = s.branch || "";
        }
      } catch {}
      setCurrentRole("office_staff");
      setUserInfo({ name: sName, nic: sNic, email: sEmail, branch: sBranch });
      setThreads((prev) => ({
        ...prev,
        office_staff: prev.office_staff.length > 0 ? prev.office_staff : getInitialWelcome("office_staff", sName),
      }));
    } else if (pathname?.includes("/Admin/")) {
      setCurrentRole("admin");
      setUserInfo({ name: "Administrator", nic: "", email: "", branch: "" });
    } else {
      // Home page, About, Services, etc. (Public / Guest)
      setCurrentRole("guest");
      setUserInfo({ name: "", nic: "", email: "", branch: "" });
    }
  }, [pathname]);

  const messages = threads[currentRole] || getInitialWelcome(currentRole, userInfo.name);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Avoid clashing with existing bottom-8 right-8 support chat icon on portal pages
  const hasExistingBottomChat = Boolean(
    pathname?.includes("/Agent/") ||
    pathname?.includes("/Policy_Holder/") ||
    pathname?.includes("/Office_Staff/") ||
    pathname?.includes("/Admin/")
  );

  // User instructions: exclude claim apply process and login pages
  const isExcluded = Boolean(
    pathname?.includes("/Policy_Holder/New_Claim") ||
    pathname === "/Login" ||
    pathname?.toLowerCase().startsWith("/login")
  );

  // Aligned cleanly above the floating claim chat button (bottom-8 right-8)
  const bottomPositionClass = "bottom-[108px] right-8";

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 80);
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleSend = async (customText?: string) => {
    const textToSend = (customText || inputText).trim();
    if (!textToSend || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const updatedMessages = [...messages, userMsg];
    setThreads((prev) => ({
      ...prev,
      [currentRole]: updatedMessages,
    }));
    setInputText("");
    setIsLoading(true);
    scrollToBottom();

    try {
      const history = updatedMessages.slice(-8).map((m) => ({
        role: m.sender === "user" ? "user" : "model",
        text: m.text,
      }));

      const baseApi = API_URL.replace(/\/$/, "");
      const res = await fetch(`${baseApi}/chat/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          history,
          userRole: currentRole,
          userNic: userInfo.nic,
          userEmail: userInfo.email,
          userName: userInfo.name,
          branch: userInfo.branch,
        }),
      });

      const data = await res.json();
      const replyText =
        data.reply ||
        "I am currently unable to fetch an answer. Please dial 011-2303300 for 24/7 Sanasa Vehicle Assistance.";

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setThreads((prev) => ({
        ...prev,
        [currentRole]: [...(prev[currentRole] || []), aiMsg],
      }));
    } catch (err) {
      console.warn("AI Chat send error:", err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: "ai",
        text: "⚠️ Connection to Sanasa AI failed. Please check your network or call the Sanasa 24/7 Accident Hotline at **011-2303300**.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setThreads((prev) => ({
        ...prev,
        [currentRole]: [...(prev[currentRole] || []), errorMsg],
      }));
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  };

  const clearChat = () => {
    setThreads((prev) => ({
      ...prev,
      [currentRole]: getInitialWelcome(currentRole, userInfo.name),
    }));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Header dynamic titles based on user role
  const headerDetails = useMemo(() => {
    if (currentRole === "policy_holder") {
      return {
        title: userInfo.name ? `Sanasa AI • ${userInfo.name.split(" ")[0]}` : "Policyholder Assistant",
        subtitle: "Policyholder Portal • Private & Verified",
      };
    }
    if (currentRole === "agent") {
      return {
        title: userInfo.name ? `Field AI • ${userInfo.name.split(" ")[0]}` : "Agent Assistant",
        subtitle: "Inspection & Field Assessment Portal",
      };
    }
    if (currentRole === "office_staff") {
      return {
        title: userInfo.name ? `Operations AI • ${userInfo.name.split(" ")[0]}` : "Operations Staff AI",
        subtitle: "Claim Review & Approval Portal",
      };
    }
    if (currentRole === "admin") {
      return {
        title: "Sanasa Admin AI",
        subtitle: "Governance & Operations Portal",
      };
    }
    return {
      title: "Sanasa AI Assistant",
      subtitle: "Vehicle & Motor Insurance Specialist",
    };
  }, [currentRole, userInfo.name]);

  const currentPrompts = PROMPTS_BY_ROLE[currentRole] || PROMPTS_BY_ROLE.guest;

  const renderFormattedText = (text: string) => {
    const lines = text.split("\n");

    return lines.map((line, lIdx) => {
      // Parse markdown link: [label](url)
      const linkRegex = /\[(.*?)\]\((.*?)\)/g;
      const hasLink = linkRegex.test(line);

      if (hasLink) {
        linkRegex.lastIndex = 0;
        const elements: React.ReactNode[] = [];
        let lastIdx = 0;
        let match;
        let subKey = 0;

        while ((match = linkRegex.exec(line)) !== null) {
          if (match.index > lastIdx) {
            elements.push(
              <span key={`txt-${subKey++}`}>{line.substring(lastIdx, match.index)}</span>
            );
          }
          const label = match[1];
          const rawUrl = match[2];
          const serverRoot = API_URL.replace(/\/api\/?$/, "").replace(/\/$/, "");
          const targetUrl = rawUrl.startsWith("http")
            ? rawUrl
            : `${serverRoot}/${rawUrl.replace(/^\//, "")}`;

          const displayLabel = label.startsWith("/")
            ? "Download Official Claim Dossier"
            : label;

          elements.push(
            <a
              key={`link-${subKey++}`}
              href={targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-semibold text-sky-700 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 px-2.5 py-1 rounded-lg transition-all my-1 text-xs border border-sky-300 shadow-xs group"
            >
              <span>📄</span>
              <span className="underline group-hover:text-sky-950">{displayLabel}</span>
              <span className="text-[10px] text-sky-500 font-bold ml-0.5">↗</span>
            </a>
          );
          lastIdx = match.index + match[0].length;
        }

        if (lastIdx < line.length) {
          elements.push(<span key={`txt-${subKey++}`}>{line.substring(lastIdx)}</span>);
        }

        return (
          <div key={lIdx} className="my-1 text-slate-800">
            {elements}
          </div>
        );
      }

      const parts = line.split(/(\*\*.*?\*\*|`.*?`)/g);
      const isBullet = line.trim().startsWith("•") || line.trim().startsWith("-");
      return (
        <div key={lIdx} className={`${isBullet ? "pl-2 my-0.5" : "my-0.5"}`}>
          {parts.map((part, pIdx) => {
            if (part.startsWith("**") && part.endsWith("**")) {
              return (
                <strong key={pIdx} className="font-bold text-sky-950">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            if (part.startsWith("`") && part.endsWith("`")) {
              const codeVal = part.slice(1, -1);
              return (
                <button
                  key={pIdx}
                  type="button"
                  onClick={() => handleSend(codeVal)}
                  title={`Click to check details of ${codeVal}`}
                  className="inline-block bg-sky-100 hover:bg-sky-200 text-sky-900 font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded border border-sky-300 transition-colors mx-0.5 cursor-pointer"
                >
                  {codeVal}
                </button>
              );
            }
            return part;
          })}
        </div>
      );
    });
  };

  if (isExcluded) return null;

  return (
    <>
      {/* ── COLORFUL FLOATING AI BUTTON ── */}
      {!isOpen && (
        <div className={`fixed ${bottomPositionClass} z-40 transition-all duration-150`}>
          <div className="relative group flex items-center justify-center">
            {/* Tooltip on hover */}
            <div className="absolute right-full mr-3 px-3 py-1.5 rounded-xl bg-[#0a192f] text-white text-xs font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-xl border border-sky-400/20 flex items-center gap-2">
              <span className="text-[#00ddff] font-bold">
                {currentRole === "policy_holder" ? "My AI Assistant" : currentRole === "agent" ? "Agent Field AI" : currentRole === "office_staff" ? "Operations AI" : "Sanasa AI"}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            {/* Vibrant gradient circular button with cyan glow */}
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              aria-label="Open Sanasa AI Assistant"
              className="bg-gradient-to-tr from-[#0a192f] via-[#0f2d4a] to-[#0284c7] hover:from-[#081220] hover:to-[#0369a1] text-white p-5 rounded-full shadow-[0_10px_25px_-5px_rgba(2,132,199,0.4)] transition-all duration-150 hover:scale-110 active:scale-95 cursor-pointer focus:outline-none border-2 border-white/20 flex items-center justify-center relative"
            >
              <HugeiconsIcon icon={ChatBotIcon} className="w-7 h-7 text-white" strokeWidth={2} />
              {/* Online Green Indicator Dot */}
              <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 ring-2 ring-[#0a192f] animate-pulse" />
            </button>
          </div>
        </div>
      )}

      {/* ── COLORFUL MODERN AI CHAT WINDOW ── */}
      {isOpen && (
        <div className={`fixed ${hasExistingBottomChat ? "bottom-24 right-8" : "bottom-8 right-8"} z-50 w-[375px] max-w-[calc(100vw-2rem)] h-[550px] max-h-[82vh] bg-white rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200`}>
          {/* Vibrant Gradient Header */}
          <div className="bg-gradient-to-r from-[#0a192f] via-[#0f2d4a] to-[#0369a1] text-white px-4.5 py-3.5 flex items-center justify-between border-b border-white/10 select-none shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="relative w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border-1.5 border-[#00ddff] shadow-sm">
                <HugeiconsIcon icon={ChatBotIcon} className="w-5 h-5 text-[#00ddff]" strokeWidth={2} />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0f2d4a]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm text-white tracking-tight">{headerDetails.title}</h3>
                  <span className="text-[11px] text-[#00ddff] font-bold">✓</span>
                </div>
                <p className="text-[11px] text-sky-200/90 font-medium truncate max-w-[200px]">
                  {headerDetails.subtitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={clearChat}
                title="Clear conversation"
                className="w-7 h-7 rounded-lg text-sky-200 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer border-none bg-transparent"
              >
                <HugeiconsIcon icon={Delete02Icon} className="w-4 h-4 text-sky-200" strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close"
                className="w-7 h-7 rounded-lg text-sky-200 hover:text-white hover:bg-rose-600/80 flex items-center justify-center transition-colors cursor-pointer border-none bg-transparent"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4 text-white" strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* Colorful Quick Prompts Bar (Specific to the active user role) */}
          <div className="bg-slate-50/80 border-b border-slate-100 px-3 py-2 overflow-x-auto flex gap-1.5 no-scrollbar">
            {currentPrompts.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(p.text)}
                disabled={isLoading}
                className={`shrink-0 text-[11px] font-semibold border px-3 py-1 rounded-full transition-all cursor-pointer shadow-2xs ${p.colorClass}`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Message Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-[#f8fafc] to-[#f1f5f9]">
            {messages.map((m) => {
              const isUser = m.sender === "user";
              return (
                <div
                  key={m.id}
                  className={`flex items-end gap-2 ${isUser ? "justify-end" : "justify-start"}`}
                >
                  {!isUser && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#0284c7] to-[#38bdf8] flex items-center justify-center text-white shadow-xs shrink-0 mb-0.5">
                      <HugeiconsIcon icon={ChatBotIcon} className="w-4 h-4 text-white" strokeWidth={2} />
                    </div>
                  )}
                  <div
                    className={`max-w-[82%] px-4 py-2.5 rounded-2xl text-[12.5px] leading-relaxed shadow-sm ${
                      isUser
                        ? "bg-gradient-to-r from-[#0a192f] to-[#0f2d4a] text-white rounded-br-xs"
                        : "bg-white text-slate-800 border border-sky-100 rounded-bl-xs"
                    }`}
                  >
                    {renderFormattedText(m.text)}
                    <div
                      className={`text-[9.5px] mt-1 text-right font-medium ${
                        isUser ? "text-sky-300" : "text-slate-400"
                      }`}
                    >
                      {m.timestamp}
                    </div>
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#0284c7] to-[#38bdf8] flex items-center justify-center text-white shadow-xs shrink-0">
                  <HugeiconsIcon icon={ChatBotIcon} className="w-4 h-4 text-white animate-pulse" strokeWidth={2} />
                </div>
                <div className="bg-white border border-sky-100 text-sky-700 px-3.5 py-2 rounded-2xl text-xs rounded-bl-xs flex items-center gap-1.5 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0284c7] animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0284c7] animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0284c7] animate-bounce [animation-delay:0.4s]" />
                  <span className="text-[11px] font-medium text-sky-700 ml-1">Sanasa AI is analyzing...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Clean Colorful Input Bar */}
          <div className="p-3 bg-white border-t border-slate-100">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-full px-3.5 py-1 focus-within:border-[#0284c7] focus-within:bg-white focus-within:ring-2 focus-within:ring-sky-100 transition-all">
              <textarea
                ref={inputRef}
                rows={1}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  currentRole === "policy_holder"
                    ? "Ask about your claims, vehicles, or filing..."
                    : currentRole === "agent"
                    ? "Ask about on-site inspections, photos..."
                    : currentRole === "office_staff"
                    ? "Ask about claim verification, garage estimates..."
                    : "Ask about Sanasa vehicle policies, claims..."
                }
                className="flex-1 bg-transparent border-none outline-none text-xs text-slate-800 placeholder:text-slate-400 resize-none max-h-20 py-1.5"
              />
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={!inputText.trim() || isLoading}
                className="w-7 h-7 rounded-full bg-[#0284c7] hover:bg-[#0369a1] disabled:opacity-30 disabled:hover:bg-[#0284c7] text-white flex items-center justify-center transition-all cursor-pointer border-none shrink-0 shadow-xs"
              >
                <HugeiconsIcon icon={SentIcon} className="w-3.5 h-3.5 text-white" strokeWidth={2} />
              </button>
            </div>
            <div className="text-[10px] text-slate-400 text-center mt-1.5 font-medium">
              Sanasa General Insurance PLC •{" "}
              <span className="text-sky-600 font-semibold">
                {currentRole === "policy_holder"
                  ? "Policyholder AI"
                  : currentRole === "agent"
                  ? "Field Agent AI"
                  : currentRole === "office_staff"
                  ? "Operations AI"
                  : "General AI Assistant"}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
