"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/app/Components/Agent/Navbar";
import Footer from "@/app/Components/Agent/Footer";
import Link from "next/link";
import { API_URL } from "@/app/config";
import { compressImage } from "../../utils/imageCompressor";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  File01Icon,
  Tick01Icon,
  Alert02Icon,
  CheckmarkCircle01Icon,
  Edit02Icon,
  Notification01Icon,
  ArrowRight01Icon,
  Task01Icon,
  Book01Icon,
  HelpCircleIcon,
  Call02Icon,
  UserIcon,
  Image01Icon,
  Upload01Icon,
  Delete02Icon,
  Car01Icon,
  Cancel01Icon,
  SmartPhone01Icon,
  BubbleChatIcon,
  SquareLock02Icon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";

// Interface representing a MongoDB Claim document
interface ClaimMessage {
  sender: string;
  message: string;
  sentAt: string;
}

interface AdditionalDoc {
  name: string;
  url: string;
  uploadedAt: string;
  uploadedBy?: string;
}

interface Claim {
  _id: string;
  claimNumber: string;
  userNic: string;
  vehiclePlate: string;
  vehicleModel?: string; // Extra details for nice display
  incidentDate: string;
  incidentTime: string;
  damageType: string;
  description: string;
  location: string;
  status: "Pending" | "In Progress" | "Approved" | "Rejected";
  branch: string;
  assignedAgent: string;
  amount: number | null;
  currentStep: number;
  createdAt: string;
  severity: "Urgent" | "Medium" | "Low";
  messages: ClaimMessage[];
  otherVehicleDetails?: any;
  priority?: string;
  inspectionReport?: string;
  inspectionSubmitted?: boolean;
  paymentReceipt?: string;
  additionalDocuments?: AdditionalDoc[];
  documentsRequested?: boolean;
  requestedDocuments?: string[];
  documentRequestTo?: string;
  accidentPhotos?: {
    front: string[];
    rear: string[];
    side: string[];
  };
  drivingLicense?: {
    front: string[];
    rear: string[];
  };
  rejectionReason?: string;
}

const parseInspectionReport = (reportText: string) => {
  if (!reportText) return null;
  if (!reportText.includes("[1. VEHICLE CONDITION DETAILS]")) {
    return { isRaw: true, rawText: reportText };
  }

  try {
    const lines = reportText.split("\n");
    let odometer = "";
    let fuelLevel = "";
    let recommendedAction = "";
    let estimatedCost = "";
    let preExistingDamage = "";
    let physicalInspectionNotes = "";
    const checklist: { [key: string]: string } = {};

    let currentSection = "";

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;

      if (trimmed.startsWith("• Odometer:")) {
        odometer = trimmed.replace("• Odometer:", "").trim();
      } else if (trimmed.startsWith("• Fuel Level:")) {
        fuelLevel = trimmed.replace("• Fuel Level:", "").trim();
      } else if (trimmed.startsWith("• Recommended Action:")) {
        recommendedAction = trimmed.replace("• Recommended Action:", "").trim();
      } else if (trimmed.startsWith("• Estimated Cost:")) {
        estimatedCost = trimmed.replace("• Estimated Cost:", "").trim();
      } else if (trimmed.includes("[3. PRE-EXISTING DAMAGE NOTES]")) {
        currentSection = "pre-existing";
      } else if (trimmed.includes("[4. PHYSICAL INSPECTION NOTES]")) {
        currentSection = "physical-notes";
      } else if (trimmed.includes("==================================") || trimmed.includes("VEHICLE CLAIM INSPECTION")) {
        // skip
      } else if (trimmed.includes("[2. COMPONENT DAMAGE CHECKLIST]")) {
        currentSection = "checklist";
      } else if (currentSection === "checklist" && trimmed.startsWith("• ")) {
        const parts = trimmed.substring(2).split(":");
        if (parts.length >= 2) {
          const compName = parts[0].trim();
          const compVal = parts[1].replace("[", "").replace("]", "").trim();
          checklist[compName] = compVal;
        }
      } else if (currentSection === "pre-existing") {
        if (!trimmed.startsWith("[")) {
          preExistingDamage += (preExistingDamage ? "\n" : "") + trimmed;
        }
      } else if (currentSection === "physical-notes") {
        if (!trimmed.startsWith("[")) {
          physicalInspectionNotes += (physicalInspectionNotes ? "\n" : "") + trimmed;
        }
      }
    });

    return {
      isRaw: false,
      odometer,
      fuelLevel,
      recommendedAction,
      estimatedCost,
      checklist,
      preExistingDamage: preExistingDamage || "None reported.",
      physicalInspectionNotes: physicalInspectionNotes || "None reported."
    };
  } catch (err) {
    console.error("Error parsing inspection report:", err);
    return { isRaw: true, rawText: reportText };
  }
};

const renderPremiumInspectionReport = (reportText: string) => {
  const parsed = parseInspectionReport(reportText);
  if (!parsed) return null;

  if (parsed.isRaw) {
    return (
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 shadow-inner select-text">
        <div className="flex items-center gap-2 mb-3 text-slate-400 select-none">
          <HugeiconsIcon icon={File01Icon} className="w-5 h-5 text-slate-400" strokeWidth={2.5} />
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Raw Inspection Report Text</span>
        </div>
        <p className="text-slate-700 text-xs font-semibold whitespace-pre-wrap leading-relaxed">
          {parsed.rawText}
        </p>
      </div>
    );
  }

  const renderBadge = (val: string) => {
    let color = "text-slate-500 bg-slate-55 border-slate-200";
    let icon = null;
    
    if (val === "None") {
      color = "text-emerald-600 bg-emerald-50/40 border-emerald-200/60";
      icon = (
        <HugeiconsIcon icon={Tick01Icon} className="w-4 h-4 text-emerald-500 flex-shrink-0" strokeWidth={3} />
      );
    } else if (val === "Minor") {
      color = "text-amber-600 bg-amber-50/40 border-amber-200/60";
      icon = (
        <HugeiconsIcon icon={Alert02Icon} className="w-4 h-4 text-amber-500 flex-shrink-0" strokeWidth={3} />
      );
    } else if (val === "Major") {
      color = "text-rose-600 bg-rose-50/40 border-rose-200/60";
      icon = (
        <HugeiconsIcon icon={Alert02Icon} className="w-4 h-4 text-rose-500 flex-shrink-0" strokeWidth={3} />
      );
    }

    return (
      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border flex items-center gap-1.5 select-none ${color}`}>
        {icon}
        {val}
      </span>
    );
  };

  return (
    <div className="border border-slate-200/80 rounded-[32px] overflow-hidden bg-slate-50/20 p-6 space-y-6 shadow-sm select-text text-left font-sans w-full">
      {/* Dashboard Title */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4 select-none">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
          <div>
            <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider leading-none">Vehicle Inspection Report</h4>
            <span className="text-[10px] font-bold text-slate-400 block mt-1 tracking-wider">OFFICIAL PHYSICAL ASSESSMENT SUMMARY</span>
          </div>
        </div>
        <span className="bg-emerald-50 border border-emerald-200/60 text-emerald-700 text-[10px] font-extrabold tracking-wider uppercase px-4 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
          <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-4 h-4" strokeWidth={2.5} />
          Verified By Agent
        </span>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Odometer */}
        <div className="bg-white border border-slate-150 rounded-2xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden h-[95px] border-t-4 border-t-blue-500">
          <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest leading-none select-none">Odometer</span>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-[17px] font-black text-slate-800">{parsed.odometer || "N/A"}</span>
          </div>
          <span className="text-[9px] text-slate-400 font-semibold select-none">Total Distance Travelled</span>
        </div>

        {/* Card 2: Fuel Level */}
        <div className="bg-white border border-slate-150 rounded-2xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden h-[95px] border-t-4 border-t-indigo-500">
          <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest leading-none select-none">Fuel Level</span>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-[17px] font-black text-slate-800">{parsed.fuelLevel || "N/A"}</span>
          </div>
          <span className="text-[9px] text-slate-400 font-semibold select-none">Current Tank Level</span>
        </div>

        {/* Card 3: Estimated Cost */}
        <div className="bg-white border border-slate-150 rounded-2xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden h-[95px] border-t-4 border-t-emerald-500">
          <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest leading-none select-none">Estimated Cost</span>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-[17px] font-black text-emerald-600">{parsed.estimatedCost || "N/A"}</span>
          </div>
          <span className="text-[9px] text-slate-400 font-semibold select-none">Assessment Valuation</span>
        </div>

        {/* Card 4: Recommendation */}
        <div className="bg-white border border-slate-150 rounded-2xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden h-[95px] border-t-4 border-t-violet-500">
          <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest leading-none select-none">Recommendation</span>
          <div className="flex items-baseline gap-1 mt-2 overflow-hidden">
            <span className="text-[13px] font-black text-slate-800 truncate" title={parsed.recommendedAction}>{parsed.recommendedAction || "N/A"}</span>
          </div>
          <span className="text-[9px] text-slate-400 font-semibold select-none">Suggested Action Payout</span>
        </div>
      </div>

      {/* Checklist & Notes Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Component Damage Checklist */}
        <div className="bg-white border border-slate-150 rounded-2xl p-5 space-y-4 shadow-sm">
          <div>
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest block border-b border-slate-100 pb-2.5 mb-3 select-none">Component Damage Checklist</span>
            <div className="space-y-2">
              {Object.entries(parsed.checklist || {}).map(([key, value]) => (
                <div key={key} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                  <span className="text-slate-700 font-bold text-xs">{key}</span>
                  {renderBadge(value)}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Remarks Column */}
        <div className="flex flex-col gap-4">
          {parsed.preExistingDamage && parsed.preExistingDamage !== "None reported." && (
            <div className="bg-amber-50/20 border border-amber-200/50 rounded-2xl p-5 shadow-sm space-y-2.5 flex-1">
              <span className="text-[10px] text-amber-800 font-black uppercase tracking-wider flex items-center gap-1.5 select-none">
                <HugeiconsIcon icon={Alert02Icon} className="w-4 h-4 text-amber-600" strokeWidth={2.5} />
                Pre-Existing Damage Remarks
              </span>
              <p className="text-slate-700 text-xs font-semibold leading-relaxed whitespace-pre-wrap">{parsed.preExistingDamage}</p>
            </div>
          )}

          <div className="bg-slate-50/50 border border-slate-200/70 rounded-2xl p-5 shadow-sm space-y-2.5 flex-1">
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider flex items-center gap-1.5 select-none">
              <HugeiconsIcon icon={Edit02Icon} className="w-4 h-4 text-slate-400" strokeWidth={2.5} />
              Physical Inspection Remarks
            </span>
            <p className="text-slate-700 text-xs font-semibold leading-relaxed whitespace-pre-wrap">{parsed.physicalInspectionNotes}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const translations = {
  en: {
    welcomeBack: "Welcome back,",
    status: "Status",
    active: "Active",
    offline: "Offline",
    assignedCountMsg: "You have {total} assigned claims today including {urgent} urgent cases. Stay safe on the road!",
    urgentClaims: "Urgent Claims",
    assignedClaims: "Assigned Claims",
    completedClaims: "Completed Claims",
    actionRequired: "Action Required: Pending Agent Document Requests",
    viewAll: "View All",
    claimPlate: "Claim / Plate",
    docsReceived: "Documents Received",
    pendingFiles: "Pending Files",
    uploadDocs: "Upload Documents",
    newClaims: "New Claims",
    fetchingClaims: "Fetching claims from database...",
    noNewClaims: "No new claims assigned to you.",
    claimNumber: "Claim Number",
    vehicle: "Vehicle",
    damageType: "Damage Type",
    location: "Location",
    progressTime: "Progress / Time",
    details: "Details",
    myActivity: "My Activity",
    loadingActivity: "Loading activity...",
    noRecentActivity: "No recent activity.",
    supportHelpdesk: "Support Helpdesk",
    supportDesc: "Need assistance with an active inspection or claim payout details? Call our staff directly.",
    line: "Line",
    acceptAssignment: "Accept Assignment",
    declineAssignment: "Decline Assignment",
    claimAccepted: "Claim Assignment Accepted",
    mobileAppNotice: "Please open the Sanasa Agent Mobile App on your smartphone to complete the physical damage evaluation, snap accident scene/license photos, and submit inspection reports.",
    okayGotIt: "Okay, Got It",
    setAvailability: "Set Your Availability",
    setAvailabilityDesc: "Please select your status to start receiving claim assignments from the branch.",
    goOnline: "Go Online (Active)",
    remainOffline: "Remain Offline",
    updatePassword: "Update Password",
    updatePasswordDesc: "You are logged in with a temporary password. Please set a new secure password.",
    currentTempPassword: "Current Temporary Password",
    newPassword: "New Password",
    confirmNewPassword: "Confirm New Password",
    passwordStrength: "Password Strength",
    setNewPassword: "Set New Password",
    weak: "Weak",
    medium: "Medium",
    strong: "Strong",
    excellent: "Excellent",
    passReqLength: "6 to 12 characters",
    passReqNumSpec: "Min. 1 number or special character",
    passReqMatch: "Passwords match",
    updating: "Updating...",
    errorFieldReq: "Current temporary password is required.",
    errorFieldLength: "Password must be between 6 and 12 characters.",
    errorFieldPattern: "Password must contain at least one number or special character.",
    errorFieldMatch: "Passwords do not match."
  },
  si: {
    welcomeBack: "නැවත සාදරයෙන් පිළිගනිමු,",
    status: "තත්ත්වය",
    active: "ක්‍රියාකාරී",
    offline: "නොබැඳි",
    assignedCountMsg: "ඔබට අද දිනට හිමිකම් {total} ක් පවරා ඇති අතර ඉන් {urgent} ක් හදිසි වේ. මඟෙහි ගමන් කිරීමේදී ප්‍රවේශම් වන්න!",
    urgentClaims: "හදිසි හිමිකම්",
    assignedClaims: "පැවරුණු හිමිකම්",
    completedClaims: "නිමකළ හිමිකම්",
    actionRequired: "ක්‍රියාමාර්ගයක් අවශ්‍යයි: නියෝජිත ලේඛන උඩුගත කිරීම්",
    viewAll: "සියල්ල බලන්න",
    claimPlate: "හිමිකම් / අංක තහඩුව",
    docsReceived: "ලැබුණු ලේඛන",
    pendingFiles: "ඉතිරි ලේඛන",
    uploadDocs: "ලේඛන උඩුගත කරන්න",
    newClaims: "නව හිමිකම්",
    fetchingClaims: "දත්ත සමුදායෙන් හිමිකම් ලබා ගනිමින්...",
    noNewClaims: "ඔබට පවරා ඇති නව හිමිකම් කිසිවක් නැත.",
    claimNumber: "හිමිකම් අංකය",
    vehicle: "වාහනය",
    damageType: "හානි වර්ගය",
    location: "ස්ථානය",
    progressTime: "ප්‍රගතිය / වේලාව",
    details: "විස්තර",
    myActivity: "මගේ ක්‍රියාකාරකම්",
    loadingActivity: "ක්‍රියාකාරකම් පූරණය වෙමින් පවතී...",
    noRecentActivity: "මෑතකාලීන ක්‍රියාකාරකම් කිසිවක් නැත.",
    supportHelpdesk: "සහාය සේවා කවුළුව",
    supportDesc: "හිමිකම් ගෙවීම් හෝ පරීක්ෂණ සහාය සඳහා අපගේ කාර්ය මණ්ඩලය අමතන්න.",
    line: "ලයින්",
    acceptAssignment: "පැවරුම පිළිගන්න",
    declineAssignment: "පැවරුම ප්‍රතික්ෂේප කරන්න",
    claimAccepted: "හිමිකම් පැවරුම පිළිගන්නා ලදී",
    mobileAppNotice: "කරුණාකර ඔබගේ ජංගම දුරකථනයෙන් සනස නියෝජිත ජංගම යෙදුම (Sanasa Agent Mobile App) විවෘත කර වාහන හානි තක්සේරුව සහ පරීක්ෂණ වාර්තාව ඉදිරිපත් කරන්න.",
    okayGotIt: "හරි, තේරුණා",
    setAvailability: "ඔබගේ තත්ත්වය සකසන්න",
    setAvailabilityDesc: "ශාඛාවෙන් ඔබට හිමිකම් පැවරීම ආරම්භ කිරීමට කරුණාකර ඔබගේ තත්ත්වය සක්‍රීය කරන්න.",
    goOnline: "සක්‍රීය වන්න (Online)",
    remainOffline: "නොබැඳිව සිටින්න",
    updatePassword: "මුරපදය යාවත්කාලීන කරන්න",
    updatePasswordDesc: "ඔබ ලොග් වී ඇත්තේ තාවකාලික මුරපදයකින්. කරුණාකර නව ආරක්ෂිත මුරපදයක් සකසන්න.",
    currentTempPassword: "වත්මන් තාවකාලික මුරපදය",
    newPassword: "නව මුරපදය",
    confirmNewPassword: "නව මුරපදය තහවුරු කරන්න",
    passwordStrength: "මුරපද ශක්තිමත්භාවය",
    setNewPassword: "නව මුරපදය සකසන්න",
    weak: "දුර්වලයි",
    medium: "මධ්‍යස්ථයි",
    strong: "ශක්තිමත්",
    excellent: "විශිෂ්ටයි",
    passReqLength: "අක්ෂර 6 ත් 12 ත් අතර",
    passReqNumSpec: "අවම වශයෙන් 1 ඉලක්කමක් හෝ විශේෂ අක්ෂරයක්",
    passReqMatch: "මුරපද ගැලපේ",
    updating: "යාවත්කාලීන වෙමින් පවතී...",
    errorFieldReq: "වත්මන් තාවකාලික මුරපදය අවශ්‍ය වේ.",
    errorFieldLength: "මුරපදය අක්ෂර 6 ත් 12 ත් අතර විය යුතුය.",
    errorFieldPattern: "මුරපදයේ අවම වශයෙන් එක් අංකයක් හෝ විශේෂ අක්ෂරයක් තිබිය යුතුය.",
    errorFieldMatch: "මුරපද නොගැලපේ."
  },
  ta: {
    welcomeBack: "மீண்டும் நல்வரவு,",
    status: "நிலை",
    active: "செயலில்",
    offline: "ஆஃப்லைன்",
    assignedCountMsg: "இன்று உங்களுக்கு {total} காப்பீட்டு கோரிக்கைகள் ஒதுக்கப்பட்டுள்ளன, அதில் {urgent} அவசர கோரிக்கைகள் ஆகும். பாதுகாப்பாக பயணம் செய்யுங்கள்!",
    urgentClaims: "அவசர கோரிக்கைகள்",
    assignedClaims: "ஒதுக்கப்பட்டவை",
    completedClaims: "முடிவடைந்தவை",
    actionRequired: "நடவடிக்கை தேவை: முகவர் ஆவண கோரிக்கைகள்",
    viewAll: "அனைத்தையும் காட்டு",
    claimPlate: "கோரிக்கை / வாகன எண்",
    docsReceived: "பெறப்பட்ட ஆவணங்கள்",
    pendingFiles: "நிலுவையில் உள்ள கோப்புகள்",
    uploadDocs: "ஆவணங்களை பதிவேற்றவும்",
    newClaims: "புதிய கோரிக்கைகள்",
    fetchingClaims: "தரவுத்தளத்திலிருந்து கோரிக்கைகளைப் பெறுகிறது...",
    noNewClaims: "உங்களுக்கு புதிய கோரிக்கைகள் எதுவும் ஒதுக்கப்படவில்லை.",
    claimNumber: "கோரிக்கை எண்",
    vehicle: "வாகனம்",
    damageType: "சேத வகை",
    location: "இடம்",
    progressTime: "முன்னேற்றம் / நேரம்",
    details: "விவரங்கள்",
    myActivity: "எனது செயல்பாடு",
    loadingActivity: "செயல்பாடுகள் ஏற்றப்படுகின்றன...",
    noRecentActivity: "சமீபத்திய செயல்பாடுகள் எதுவும் இல்லை.",
    supportHelpdesk: "ஆதரவு உதவி மையம்",
    supportDesc: "உதவி அல்லது காப்பீட்டுத் தொகை விவரங்களுக்கு எங்கள் ஊழியர்களை நேரடியாக அழைக்கவும்.",
    line: "வரிசை",
    acceptAssignment: "ஒதுக்கீட்டை ஏற்றுக்கொள்",
    declineAssignment: "ஒதுக்கீட்டை நிராகரி",
    claimAccepted: "கோரிக்கை ஒதுக்கீடு ஏற்றுக்கொள்ளப்பட்டது",
    mobileAppNotice: "சேத மதிப்பீட்டை முடிக்கவும், புகைப்படங்களை பதிவேற்றவும் உங்கள் ஸ்மார்ட்போனில் சனச முகவர் மொபைல் செயலியை (Sanasa Agent Mobile App) திறக்கவும்.",
    okayGotIt: "சரி, புரிந்து கொண்டது",
    setAvailability: "உங்களது நிலையை அமைக்கவும்",
    setAvailabilityDesc: "கிளையிலிருந்து காப்பீட்டு கோரிக்கைகளைப் பெறத் தொடங்க உங்களது நிலையைச் செயலூக்கவும்.",
    goOnline: "செயலில் இருங்கள் (Online)",
    remainOffline: "ஆஃப்லைனில் இருங்கள்",
    updatePassword: "கடவுச்சொல்லைப் புதுப்பிக்கவும்",
    updatePasswordDesc: "நீங்கள் தற்காலிக கடவுச்சொல் மூலம் உள்நுழைந்துள்ளீர்கள். புதிய பாதுகாப்பான கடவுச்சொல்லை அமைக்கவும்.",
    currentTempPassword: "தற்போதைய தற்காலிக கடவுச்சொல்",
    newPassword: "புதிய கடவுச்சொல்",
    confirmNewPassword: "புதிய கடவுச்சொல்லை உறுதிப்படுத்தவும்",
    passwordStrength: "கடவுச்சொல் வலிமை",
    setNewPassword: "புதிய கடவுச்சொல்லை அமைக்கவும்",
    weak: "பலவீனமானது",
    medium: "நடுத்தரமானது",
    strong: "வலிமையானது",
    excellent: "மிகவும் சிறந்தது",
    passReqLength: "6 முதல் 12 எழுத்துக்கள்",
    passReqNumSpec: "குறைந்தது 1 எண் அல்லது சிறப்பு எழுத்து",
    passReqMatch: "கடவுச்சொற்கள் பொருந்துகின்றன",
    updating: "புதுப்பிக்கப்படுகிறது...",
    errorFieldReq: "தற்போதைய தற்காலிக கடவுச்சொல் தேவை.",
    errorFieldLength: "கடவுச்சொல் 6 முதல் 12 எழுத்துக்களுக்குள் இருக்க வேண்டும்.",
    errorFieldPattern: "கடவுச்சொல்லில் குறைந்தபட்சம் ஒரு எண் அல்லது சிறப்பு எழுத்து இருக்க வேண்டும்.",
    errorFieldMatch: "கடவுச்சொற்கள் பொருந்தவில்லை."
  }
};

export default function AgentDashboard() {
  const [lang, setLang] = useState<"en" | "si" | "ta">("en");
  const router = useRouter();
  const [agentName, setAgentName] = useState("");
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);

  // Load language from localStorage on mount
  useEffect(() => {
    const savedLang = localStorage.getItem("language") as "en" | "si" | "ta";
    if (savedLang && ["en", "si", "ta"].includes(savedLang)) {
      setLang(savedLang);
    }
  }, []);

  // Listen to language change events from navbar
  useEffect(() => {
    const handleLangChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setLang(customEvent.detail);
      }
    };
    window.addEventListener("language-changed", handleLangChange);
    return () => window.removeEventListener("language-changed", handleLangChange);
  }, []);

  const t = translations[lang];
  const [activeSubModal, setActiveSubModal] = useState<"documents" | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [policyHolders, setPolicyHolders] = useState<any[]>([]);
  const [showSupportChat, setShowSupportChat] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [chatLogs, setChatLogs] = useState<{ sender: string; text: string }[]>([]);

  // --- Password Modal States ---
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { width: "w-0", color: "bg-slate-200", label: "None" };
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length > 8) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 1) return { width: "w-1/4 bg-rose-500", color: "bg-rose-500", label: "Weak" };
    if (score === 2) return { width: "w-2/4 bg-amber-500", color: "bg-amber-500", label: "Medium" };
    if (score === 3) return { width: "w-3/4 bg-emerald-500", color: "bg-emerald-500", label: "Strong" };
    return { width: "w-full bg-emerald-500", color: "bg-emerald-500", label: "Excellent" };
  };
  const strength = getPasswordStrength(passwordForm.newPassword);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (!passwordForm.currentPassword) return setPasswordError(t.errorFieldReq);
    if (passwordForm.newPassword.length < 6 || passwordForm.newPassword.length > 12) {
      return setPasswordError(t.errorFieldLength);
    }
    if (!/[0-9]/.test(passwordForm.newPassword) && !/[^A-Za-z0-9]/.test(passwordForm.newPassword)) {
      return setPasswordError(t.errorFieldPattern);
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return setPasswordError(t.errorFieldMatch);
    }

    setIsUpdatingPassword(true);
    try {
      const res = await fetch(`${API_URL}/agent/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: agentEmail,
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update password.");
      }

      setPasswordSuccess("Password updated successfully!");
      
      // Update sessionStorage
      const agentData = sessionStorage.getItem("logged_in_agent");
      if (agentData) {
        const agent = JSON.parse(agentData);
        agent.mustChangePassword = false;
        sessionStorage.setItem("logged_in_agent", JSON.stringify(agent));
      }

      setTimeout(() => {
        setShowPasswordModal(false);
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setPasswordError(err.message || "Failed to update password.");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const [claims, setClaims] = useState<Claim[]>([]);
  const [agentEmail, setAgentEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [availability, setAvailability] = useState<"Active" | "Offline">("Active");
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);

  // Automatically go offline on browser tab close/exit
  useEffect(() => {
    if (!agentEmail) return;
    const handleUnload = () => {
      const url = `${API_URL}/agent/availability`;
      const payload = JSON.stringify({ email: agentEmail, availability: "Offline" });
      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon(url, blob);
      } else {
        fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true
        });
      }
    };

    window.addEventListener("beforeunload", handleUnload);
    window.addEventListener("unload", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      window.removeEventListener("unload", handleUnload);
    };
  }, [agentEmail]);

  const fetchAvailability = async (email: string) => {
    try {
      const res = await fetch(`${API_URL}/agent/availability?email=${encodeURIComponent(email)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.availability) {
          setAvailability(data.availability);
        }
      }
    } catch (e) {
      console.error("Error fetching availability:", e);
    }
  };

  const toggleAvailability = async (status: "Active" | "Offline") => {
    try {
      setAvailability(status);
      const res = await fetch(`${API_URL}/agent/availability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: agentEmail, availability: status })
      });
      if (!res.ok) throw new Error("Failed to update availability");
    } catch (e) {
      console.error("Error updating availability:", e);
      alert("Failed to update status. Please try again.");
    }
  };

  const fetchPolicyHolders = async (branchName: string) => {
    try {
      const phRes = await fetch(`${API_URL}/office-staff/policy-holders?branch=${encodeURIComponent(branchName.trim())}`);
      const regsRes = await fetch(`${API_URL}/office-staff/registrations?branch=${encodeURIComponent(branchName.trim())}`);
      let allUsers: any[] = [];
      if (phRes.ok) {
        const phData = await phRes.json();
        allUsers = [...allUsers, ...(phData.policyHolders || [])];
      }
      if (regsRes.ok) {
        const regsData = await regsRes.json();
        allUsers = [...allUsers, ...(regsData.registrations || [])];
      }
      setPolicyHolders(allUsers);
    } catch (e) {
      console.error("Fetch policy holders error:", e);
    }
  };

  const getPolicyHolderName = (nic: string) => {
    if (!nic) return "-";
    const user = policyHolders.find(u => u.nic && typeof u.nic === "string" && u.nic.toLowerCase().trim() === nic.toLowerCase().trim());
    return user ? `${user.firstName} ${user.lastName}` : "Unknown Policy Holder";
  };

  const getPolicyHolderContact = (nic: string) => {
    if (!nic) return "-";
    const user = policyHolders.find(u => u.nic && typeof u.nic === "string" && u.nic.toLowerCase().trim() === nic.toLowerCase().trim());
    return user ? user.mobile : "No Contact Info";
  };

  const getPolicyHolderEmail = (nic: string) => {
    if (!nic) return "-";
    const user = policyHolders.find(u => u.nic && typeof u.nic === "string" && u.nic.toLowerCase().trim() === nic.toLowerCase().trim());
    return user ? user.email : "-";
  };

  const formatPlate = (plate: string) => {
    if (!plate) return "-";
    const cleaned = plate.trim();
    if (cleaned.includes("-")) return cleaned.toUpperCase();
    const m = cleaned.match(/^(.*[A-Za-z]+)(\d+)$/);
    if (m) return `${m[1].trim().toUpperCase()} - ${m[2]}`;
    return cleaned.toUpperCase();
  };

  const [assessmentAmount, setAssessmentAmount] = useState<string>("");
  const [inspectionReportText, setInspectionReportText] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [agentUploadFile, setAgentUploadFile] = useState<File | null>(null);
  const [agentUploadPreview, setAgentUploadPreview] = useState<string | null>(null);
  const [agentUploadDocName, setAgentUploadDocName] = useState<string>("Repair Estimate");
  const [isAgentUploading, setIsAgentUploading] = useState(false);
  const [isAcceptingClaim, setIsAcceptingClaim] = useState(false);
  const [showMobileRedirect, setShowMobileRedirect] = useState(false);
  const agentFileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (file: File | null) => {
    if (agentUploadPreview) {
      URL.revokeObjectURL(agentUploadPreview);
    }
    setAgentUploadFile(file);
    if (file) {
      setAgentUploadPreview(URL.createObjectURL(file));
    } else {
      setAgentUploadPreview(null);
    }
  };

  const fetchClaims = async (email: string, showLoading: boolean = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await fetch(`${API_URL}/agent/claims?email=${email}`);
      if (!res.ok) throw new Error("Failed to fetch claims");
      const data = await res.json();
      setClaims(data);

      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const claimIdParam = params.get("claimId");
        if (claimIdParam) {
          const found = data.find((c: Claim) => c.claimNumber === claimIdParam || c._id === claimIdParam);
          if (found) {
            setSelectedClaim(found);
          }
        }
      }
    } catch (e) {
      console.error("Fetch claims error:", e);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    const agentData = sessionStorage.getItem("logged_in_agent");
    if (!agentData) {
      router.push("/Login");
      return;
    }
    try {
      const parsed = JSON.parse(agentData);
      if (parsed.name) setAgentName(parsed.name);
      if (parsed.email) {
        setAgentEmail(parsed.email);
        fetchClaims(parsed.email);
        fetchAvailability(parsed.email);
        if (parsed.branch) {
          fetchPolicyHolders(parsed.branch);
        }
        
        // Check if availability was already prompted in this login session
        const prompted = sessionStorage.getItem("availability_prompted");
        if (!prompted) {
          setShowAvailabilityModal(true);
        }
      }
      if (parsed.mustChangePassword) {
        setShowPasswordModal(true);
      }
    } catch (e) {
      console.error(e);
      router.push("/Login");
    }
  }, []);

  // Poll availability and claims status
  useEffect(() => {
    if (!agentEmail) return;
    const interval = setInterval(() => {
      fetchAvailability(agentEmail);
      fetchClaims(agentEmail, false);
    }, 5000);
    return () => clearInterval(interval);
  }, [agentEmail]);

  // Keep selectedClaim in sync with claims list updates
  useEffect(() => {
    if (selectedClaim) {
      const updated = claims.find(c => c._id === selectedClaim._id || c.claimNumber === selectedClaim.claimNumber);
      if (updated) {
        if (JSON.stringify(updated) !== JSON.stringify(selectedClaim)) {
          setSelectedClaim(updated);
        }
      }
    }
  }, [claims, selectedClaim]);

  useEffect(() => {
    if (selectedClaim) {
      setAssessmentAmount(selectedClaim.amount ? String(selectedClaim.amount) : "");
      setInspectionReportText(selectedClaim.inspectionReport || "");
    }
  }, [selectedClaim]);

  // Lock background scroll when selectedClaim or password modal is open
  useEffect(() => {
    if (selectedClaim || showPasswordModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedClaim, showPasswordModal]);

  const getSeverity = (damageType: string): "Urgent" | "Medium" | "Low" => {
    const type = (damageType || "").toLowerCase();
    if (type.includes("fire")) return "Urgent";
    if (type.includes("accident") || type.includes("crash")) return "Medium";
    return "Low";
  };

  const getRecipientForDoc = (claim: Claim, name: string) => {
    const msg = [...(claim.messages || [])]
      .reverse()
      .find(m => m.message && typeof m.message === "string" && m.message.includes(`Requested: ${name}`));
    if (msg && msg.message) {
      if (msg.message.includes("[Document Request to Agent]")) return "Agent";
      if (msg.message.includes("[Document Request to User]")) return "User";
    }
    return claim.documentRequestTo || "User";
  };

  const getAgentPendingRequests = (claim: Claim) => {
    if (!claim.requestedDocuments) return [];
    return claim.requestedDocuments.filter(name => {
      const isUploaded = (claim.additionalDocuments || []).some(
        doc => doc.name.trim().toLowerCase() === name.trim().toLowerCase() && doc.uploadedBy === "Agent"
      );
      if (isUploaded) return false;
      return getRecipientForDoc(claim, name) === "Agent";
    });
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr);
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    } catch { return String(dateStr); }
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr);
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      const hours = d.getHours().toString().padStart(2, '0');
      const minutes = d.getMinutes().toString().padStart(2, '0');
      return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()} ${hours}:${minutes}`;
    } catch { return String(dateStr); }
  };

  const getDocDetails = (claim: Claim, name: string, status: "Pending" | "Submitted") => {
    let requestedAt = "";
    let submittedAt = "";
    let sender = "Office Staff";

    const msg = [...(claim.messages || [])]
      .reverse()
      .find(m => m.message && typeof m.message === "string" && m.message.includes(`Requested: ${name}`));
    if (msg) {
      requestedAt = formatDateTime(msg.sentAt);
      sender = msg.sender || "Office Staff";
    } else {
      requestedAt = formatDateTime(claim.createdAt);
    }

    if (status === "Submitted") {
      const doc = (claim.additionalDocuments || []).find(
        d => d.name.trim().toLowerCase() === name.trim().toLowerCase()
      );
      if (doc && doc.uploadedAt) {
        submittedAt = formatDateTime(doc.uploadedAt);
      }
    }

    return { requestedAt, submittedAt, sender };
  };

  // Derive columns from MongoDB collection
  const activeClaims = claims
    .filter(c => c.status !== "Approved" && c.status !== "Rejected")
    .sort((a, b) => {
      const aSev = getSeverity(a.damageType);
      const bSev = getSeverity(b.damageType);
      if (aSev === "Urgent" && bSev !== "Urgent") return -1;
      if (aSev !== "Urgent" && bSev === "Urgent") return 1;
      return 0;
    });
  const completedClaims = claims.filter(c => c.status === "Approved" || c.status === "Rejected");
  const latestActivities = [...claims]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 4);

  const claimsWithPendingAgentRequests = activeClaims.filter(
    claim => getAgentPendingRequests(claim).length > 0
  );

  const totalAssigned = activeClaims.length;
  const urgentCount = activeClaims.filter(c => getSeverity(c.damageType) === "Urgent").length;

  const handleApproveAssessment = async (claimId: string) => {
    try {
      const numAmount = parseFloat(assessmentAmount);
      if (isNaN(numAmount) || numAmount <= 0) {
        alert("Please enter a valid assessment amount.");
        return;
      }

      const res = await fetch(`${API_URL}/agent/claims/${claimId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Approved", amount: numAmount })
      });
      if (!res.ok) {
        alert("Failed to update claim assessment status.");
        return;
      }
      alert("Assessment approved and status updated to Approved!");
      setSelectedClaim(null);
      fetchClaims(agentEmail);
    } catch (e) {
      console.error(e);
      alert("Error sending update request.");
    }
  };

  const handleAcceptClaim = async (claimId: string) => {
    try {
      setIsAcceptingClaim(true);
      const res = await fetch(`${API_URL}/agent/claims/${claimId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acceptClaim: true })
      });
      if (!res.ok) {
        alert("Failed to accept claim.");
        return;
      }
      setShowMobileRedirect(true);
      // Refresh claims list
      await fetchClaims(agentEmail);
      // Also refresh the selectedClaim state with the new data
      const updatedRes = await fetch(`${API_URL}/agent/claims?email=${agentEmail}`);
      if (updatedRes.ok) {
        const data = await updatedRes.json();
        const freshClaim = data.find((c: Claim) => c._id === claimId);
        if (freshClaim) setSelectedClaim(freshClaim);
      }
    } catch (e) {
      console.error(e);
      alert("Error accepting claim.");
    } finally {
      setIsAcceptingClaim(false);
    }
  };

  const handleDeclineClaim = async (claimId: string, claimNumber: string) => {
    try {
      setIsAcceptingClaim(true);
      const res = await fetch(`${API_URL}/office-staff/claims/${claimNumber}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "Rejected",
          currentStep: 5,
          rejectionReason: "Rejected by Agent",
          messageText: "Claim rejected by Agent.",
          messageRecipient: "Office Staff",
          messageSender: "Agent"
        })
      });
      if (!res.ok) {
        alert("Failed to decline claim.");
        return;
      }
      alert("Claim rejected successfully!");
      // Refresh claims list
      await fetchClaims(agentEmail);
      // Also refresh the selectedClaim state with the new data
      const updatedRes = await fetch(`${API_URL}/agent/claims?email=${agentEmail}`);
      if (updatedRes.ok) {
        const data = await updatedRes.json();
        const freshClaim = data.find((c: Claim) => c._id === claimId);
        if (freshClaim) setSelectedClaim(freshClaim);
      }
    } catch (e) {
      console.error(e);
      alert("Error declining claim.");
    } finally {
      setIsAcceptingClaim(false);
    }
  };

  const handleSubmitInspectionReport = async (claimId: string) => {
    try {
      if (!inspectionReportText.trim()) {
        alert("Please enter inspection report details.");
        return;
      }
      setIsSubmittingReport(true);
      const res = await fetch(`${API_URL}/agent/claims/${claimId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inspectionReport: inspectionReportText.trim(),
          inspectionSubmitted: true,
          status: "In Progress"
        })
      });
      if (!res.ok) {
        alert("Failed to submit inspection report.");
        return;
      }
      alert("Inspection report submitted successfully!");
      setSelectedClaim(null);
      fetchClaims(agentEmail);
      setInspectionReportText("");
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleAgentUpload = async () => {
    if (!selectedClaim || !agentUploadFile) return;
    setIsAgentUploading(true);
    try {
      const convertToBase64 = (file: File): Promise<string> => {
        return compressImage(file);
      };
      const base64 = await convertToBase64(agentUploadFile);
      const res = await fetch(`${API_URL}/policy-holder/update-claim/${selectedClaim.claimNumber}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uploadedDocuments: [
            {
              documentName: agentUploadDocName,
              fileData: base64,
              uploadedBy: "Agent"
            }
          ]
        })
      });
      if (res.ok) {
        alert("Document uploaded successfully!");
        handleFileChange(null);
        // Refresh claims list
        await fetchClaims(agentEmail);
        // Also refresh the selectedClaim state with the new data
        const updatedRes = await fetch(`${API_URL}/agent/claims?email=${agentEmail}`);
        if (updatedRes.ok) {
          const data = await updatedRes.json();
          const freshClaim = data.find((c: Claim) => c.claimNumber === selectedClaim.claimNumber);
          if (freshClaim) setSelectedClaim(freshClaim);
        }
      } else {
        const data = await res.json();
        alert(data.error || "Failed to upload document.");
      }
    } catch (e) {
      console.error(e);
      alert("An error occurred during upload.");
    } finally {
      setIsAgentUploading(false);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    const newLogs = [...chatLogs, { sender: "Agent (You)", text: chatMessage }];
    setChatLogs(newLogs);
    setChatMessage("");

    // Mock automatic responder
    setTimeout(() => {
      setChatLogs(prev => [
        ...prev,
        { sender: "Support Staff", text: "We have received your message. An agent support officer will connect shortly." }
      ]);
    }, 1500);
  };

  return (
    <div className="min-h-screen w-full bg-[#f8fafc] flex flex-col font-sans antialiased">
      <Navbar />

      {/* Main Banner Area */}
      <div className="w-full relative overflow-hidden bg-slate-900 text-white py-14 md:py-20 px-6 md:px-16 flex flex-col justify-center rounded-b-[4rem] shadow-2xl">
        {/* Background Image with Dark Overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40 mix-blend-multiply transition-all duration-750 ease-out"
          style={{ backgroundImage: "url('/newclaim1.webp')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-900/90 to-cyan-950/40 pointer-events-none" />

        {/* Ambient Floating Glow Circles */}
        <div className="absolute top-[-20%] right-[-10%] w-[45%] h-[60%] rounded-full bg-cyan-400/10 blur-[130px] pointer-events-none animate-pulse duration-10000" />
        <div className="absolute bottom-[-10%] left-[5%] w-[40%] h-[50%] rounded-full bg-red-500/10 blur-[120px] pointer-events-none animate-pulse duration-8000" />

        <div className="relative z-10 max-w-7xl mx-auto w-full flex flex-col gap-8">
          <div className="space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white drop-shadow-sm select-none">
                {t.welcomeBack} <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-cyan-200">{agentName}</span>!
              </h1>
              {/* Availability Status Selector */}
              <div className="flex items-center gap-2 bg-slate-950/45 border border-white/10 rounded-full p-1 self-start md:self-center select-none shadow-md">
                <span className="text-[10px] text-slate-400 font-extrabold tracking-wider uppercase pl-3 pr-1">{t.status}</span>
                <button
                  onClick={() => toggleAvailability("Active")}
                  className={`px-4 py-2 rounded-full text-xs font-black cursor-pointer transition-all border-none flex items-center gap-1.5 ${
                    availability === "Active"
                      ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30"
                      : "bg-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5"
                  }`}
                >
                  {availability === "Active" && <span className="w-2 h-2 rounded-full bg-white animate-pulse" />}
                  {t.active}
                </button>
                <button
                  onClick={() => toggleAvailability("Offline")}
                  className={`px-4 py-2 rounded-full text-xs font-black cursor-pointer transition-all border-none flex items-center gap-1.5 ${
                    availability === "Offline"
                      ? "bg-red-500 text-white shadow-md shadow-red-500/30"
                      : "bg-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5"
                  }`}
                >
                  {availability === "Offline" && <span className="w-2 h-2 rounded-full bg-white animate-pulse" />}
                  {t.offline}
                </button>
              </div>
            </div>
            <p className="text-lg md:text-xl text-slate-300 max-w-3xl leading-relaxed font-medium">
              {t.assignedCountMsg.replace("{total}", String(totalAssigned)).replace("{urgent}", String(urgentCount))}
            </p>
          </div>

          {/* Floating Metric Badges - Placed below the text in a row */}
          <div className="flex flex-wrap gap-6 mt-2">
            {/* Urgent Card */}
            <div className="bg-gradient-to-br from-[#7f1d1d]/85 to-[#991b1b]/80 border border-red-500/40 rounded-2xl px-6 py-4 flex items-center gap-5 w-64 shadow-[0_10px_30px_rgba(239,68,68,0.15)] hover:bg-[#7f1d1d]/90 hover:scale-[1.02] hover:border-red-400 transition-all duration-300">
              {/* Siren/Alarm Light Icon on the left */}
              <HugeiconsIcon icon={Notification01Icon} className="w-10 h-10 text-white flex-shrink-0" strokeWidth={2} />
              {/* Stacked Text in the middle */}
              <div className="flex flex-col text-left">
                <span className="text-xs text-red-200 opacity-90 font-bold uppercase tracking-wider">{t.urgentClaims}</span>
                <span className="text-base text-white font-extrabold tracking-wide -mt-0.5">{lang === "en" ? "Claims" : ""}</span>
              </div>
              {/* Large count number on the right */}
              <span className="text-3xl font-black text-white ml-auto">{urgentCount}</span>
            </div>

            {/* Assigned Card */}
            <div className="bg-gradient-to-br from-[#0e7490]/85 to-[#0891b2]/80 border border-cyan-400/40 rounded-2xl px-6 py-4 flex items-center gap-5 w-64 shadow-[0_10px_30px_rgba(6,182,212,0.15)] hover:bg-[#0e7490]/90 hover:scale-[1.02] hover:border-cyan-300 transition-all duration-300">
              {/* ID Badge Icon on the left */}
              <HugeiconsIcon icon={File01Icon} className="w-9 h-9 text-white flex-shrink-0" strokeWidth={2} />
              {/* Stacked Text in the middle */}
              <div className="flex flex-col text-left">
                <span className="text-xs text-cyan-200 opacity-90 font-bold uppercase tracking-wider">{t.assignedClaims}</span>
                <span className="text-base text-white font-extrabold tracking-wide -mt-0.5">{lang === "en" ? "Claims" : ""}</span>
              </div>
              {/* Large count number on the right */}
              <span className="text-3xl font-black text-white ml-auto">{totalAssigned}</span>
            </div>

            {/* Completed Card */}
            <div className="bg-gradient-to-br from-[#065f46]/85 to-[#047857]/80 border border-emerald-500/40 rounded-2xl px-6 py-4 flex items-center gap-5 w-64 shadow-[0_10px_30px_rgba(16,185,129,0.15)] hover:bg-[#065f46]/90 hover:scale-[1.02] hover:border-emerald-400 transition-all duration-300">
              {/* Checkmark Shield Icon on the left */}
              <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-9 h-9 text-white flex-shrink-0" strokeWidth={2.5} />
              {/* Stacked Text in the middle */}
              <div className="flex flex-col text-left">
                <span className="text-xs text-emerald-200 opacity-90 font-bold uppercase tracking-wider">{t.completedClaims}</span>
                <span className="text-base text-white font-extrabold tracking-wide -mt-0.5">{lang === "en" ? "Claims" : ""}</span>
              </div>
              {/* Large count number on the right */}
              <span className="text-3xl font-black text-white ml-auto">{completedClaims.length}</span>
            </div>
          </div>

        </div>
      </div>

      {/* Grid Dashboard Content */}
      <main className="max-w-7xl mx-auto w-full px-6 py-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: New Claims (Takes 2 grid columns on large screens) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Pending Document Requests Section */}
          {claimsWithPendingAgentRequests.length > 0 && (
            <div className="flex flex-col gap-4 bg-gradient-to-br from-white/90 to-slate-50/50 backdrop-blur-md border border-red-200/40 rounded-3xl p-6 shadow-lg shadow-red-500/[0.005] relative overflow-hidden">
              <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-200/60 pb-3 mb-2">
                <h2 className="text-lg font-extrabold text-slate-800 tracking-tight flex items-center gap-2.5 select-none">
                  <HugeiconsIcon icon={Alert02Icon} className="w-5 h-5 text-red-500 animate-pulse" strokeWidth={2.5} />
                  {t.actionRequired}
                  {/* Total Pending Count Badge */}
                  <span className="bg-gradient-to-r from-red-500 to-rose-600 text-white text-xs font-black px-3 py-1 rounded-full flex items-center gap-1 select-none shadow-[0_2px_8px_rgba(239,68,68,0.25)] animate-pulse">
                    {claimsWithPendingAgentRequests.length}
                  </span>
                </h2>
                {claimsWithPendingAgentRequests.length > 3 && (
                  <Link href="/Agent/Documents" className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-4 py-2 rounded-full text-xs font-extrabold transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-1 select-none shadow-sm">
                    {t.viewAll}
                    <HugeiconsIcon icon={ArrowRight01Icon} className="w-4 h-4 text-red-500" strokeWidth={2.5} />
                  </Link>
                )}
              </div>
              <div className="flex flex-col gap-3">
                {claimsWithPendingAgentRequests.slice(0, 3).map((claim) => {
                  const pendingDocs = getAgentPendingRequests(claim);
                  const totalDocs = (claim.requestedDocuments || []).filter(
                    name => getRecipientForDoc(claim, name) === "Agent"
                  );
                  const uploadedDocsCount = totalDocs.length - pendingDocs.length;

                  return (
                    <div
                      key={claim._id}
                      className="relative overflow-hidden bg-white/70 backdrop-blur-sm border border-slate-100/80 rounded-2xl p-4 pl-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm hover:shadow-[0_8px_24px_rgba(239,68,68,0.03)] hover:border-red-200/50 hover:bg-white hover:scale-[1.01] hover:-translate-y-0.5 transition-all duration-300 group"
                    >
                      {/* Vertical Red Accent Strip */}
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-red-500 to-rose-600 group-hover:w-2 transition-all duration-300" />
                      
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center mr-2">
                        {/* Col 1: Claim ID & Plate */}
                        <div className="flex flex-col gap-1 min-w-0">
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{t.claimPlate}</span>
                          <span className="text-sm font-bold text-slate-800 truncate">
                            {claim.claimNumber} · {claim.vehiclePlate}
                          </span>
                        </div>

                        {/* Col 2: Received Progress */}
                        <div className="flex flex-col gap-1 min-w-0">
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{t.docsReceived}</span>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 select-none">
                            <HugeiconsIcon icon={Task01Icon} className="w-4 h-4 text-cyan-600 flex-shrink-0" strokeWidth={2.2} />
                            <span>
                              <span className="text-emerald-600 font-extrabold">{uploadedDocsCount}</span> / <span className="text-slate-800 font-extrabold">{totalDocs.length}</span>
                            </span>
                          </div>
                        </div>

                        {/* Col 3: Pending Documents List */}
                        <div className="flex flex-col gap-1 min-w-0">
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{t.pendingFiles}</span>
                          <div className="flex flex-wrap gap-1.5 mt-0.5">
                            {pendingDocs.map((docName, idx) => (
                              <span key={idx} className="text-[9px] font-black bg-red-50/70 text-red-600 border border-red-150 px-3 py-1 rounded-full select-none tracking-wide uppercase transition-colors hover:bg-red-100/50">
                                {docName}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <Link
                        href={`/Agent/Documents?uploadClaim=${claim.claimNumber}`}
                        className="bg-[#000080] hover:bg-[#00ddff] hover:text-black hover:shadow-[0_4px_14px_rgba(0,221,255,0.3)] text-xs font-black py-3 px-5 rounded-full transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer shadow-sm border-none self-start md:self-center flex-shrink-0 text-center no-underline"
                      >
                        {t.uploadDocs}
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* New Claims Section */}
          <div className="flex flex-col gap-4 bg-gradient-to-br from-white/90 to-slate-50/50 backdrop-blur-md border border-slate-200/40 rounded-3xl p-6 shadow-lg shadow-slate-500/[0.005] relative overflow-hidden">
            <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-200/60 pb-3 mb-2">
              <h2 className="text-lg font-extrabold text-slate-800 tracking-tight flex items-center gap-2.5 select-none">
                <HugeiconsIcon icon={File01Icon} className="w-5 h-5 text-slate-600" strokeWidth={2.5} />
                {t.newClaims}
                {/* Total Count Badge */}
                <span className="bg-gradient-to-r from-slate-700 to-slate-800 text-white text-xs font-black px-3 py-1 rounded-full flex items-center justify-center select-none shadow-[0_2px_8px_rgba(15,23,42,0.12)] border border-slate-700/30">
                  {activeClaims.length}
                </span>
              </h2>
            </div>

            <div className="flex flex-col gap-3">
              {loading ? (
                <div className="text-slate-400 font-bold py-10 text-center text-sm animate-pulse">
                  {t.fetchingClaims}
                </div>
              ) : activeClaims.length === 0 ? (
                <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center text-slate-500 font-semibold text-sm">
                  {t.noNewClaims}
                </div>
              ) : (
                activeClaims.map((claim) => {
                  const severity = getSeverity(claim.damageType);
                  const isUrgent = severity === "Urgent";
                  
                  return (
                    <div
                      key={claim._id}
                      className="relative overflow-hidden bg-white/70 backdrop-blur-sm border border-slate-100/80 rounded-2xl p-4 pl-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm hover:shadow-[0_8px_24px_rgba(0,0,0,0.03)] hover:border-slate-200 hover:bg-white hover:scale-[1.01] hover:-translate-y-0.5 transition-all duration-300 group"
                    >
                      {/* Decorative vertical color bar that glows/width-increases on card hover */}
                      <div className={`absolute left-0 top-0 bottom-0 w-1 group-hover:w-2 transition-all duration-300 ${isUrgent ? 'bg-gradient-to-b from-red-500 to-rose-600' : 'bg-gradient-to-b from-cyan-400 to-cyan-500'}`} />
                      
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-center mr-2">
                        {/* Col 1: Claim ID & Severity */}
                        <div className="flex flex-col gap-1 min-w-0">
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{t.claimNumber}</span>
                          <div className="text-sm font-bold text-slate-800 truncate flex items-center gap-1.5 flex-wrap">
                            {claim.claimNumber}
                            {isUrgent ? (
                              <span className="text-[9px] font-black uppercase bg-red-50 text-red-600 border border-red-200 px-3 py-1 rounded-full select-none tracking-wide">
                                Urgent
                              </span>
                            ) : (
                              <span className="text-[9px] font-black uppercase bg-cyan-50 text-cyan-700 border border-cyan-200 px-3 py-1 rounded-full select-none tracking-wide">
                                {severity}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Col 2: Vehicle */}
                        <div className="flex flex-col gap-1 min-w-0">
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{t.vehicle}</span>
                          <span className="text-xs font-bold text-slate-700 truncate">
                            {claim.vehiclePlate} {claim.vehicleModel && <span className="font-semibold text-slate-500">({claim.vehicleModel})</span>}
                          </span>
                        </div>

                        {/* Col 3: Damage Type */}
                        <div className="flex flex-col gap-1 min-w-0">
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{t.damageType}</span>
                          <span className="text-xs font-bold text-slate-700 truncate">{claim.damageType}</span>
                        </div>

                        {/* Col 4: Location */}
                        <div className="flex flex-col gap-1 min-w-0">
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{t.location}</span>
                          <span className="text-xs font-bold text-slate-700 truncate" title={claim.location}>{claim.location}</span>
                        </div>

                        {/* Col 5: Progress / Time */}
                        <div className="flex flex-col gap-1 min-w-0">
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{t.progressTime}</span>
                          <span className="text-xs font-bold text-slate-700 truncate">
                            Step {claim.currentStep} of 4 · <span className="text-slate-400 font-semibold">{claim.incidentTime}</span>
                          </span>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => setSelectedClaim(claim)}
                        className="bg-[#000080] hover:bg-[#00ddff] hover:text-black hover:shadow-[0_4px_14px_rgba(0,221,255,0.3)] text-xs font-black py-3 px-5 rounded-full transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer shadow-sm border-none self-start md:self-center flex-shrink-0"
                      >
                        {t.details}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Notifications, My Activity & Support Details */}
        <div className="flex flex-col gap-8">
          
          <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2.5 select-none">
              <HugeiconsIcon icon={Book01Icon} className="w-5 h-5 text-slate-600 flex-shrink-0" strokeWidth={2.5} />
              {t.myActivity}
            </h2>

            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-[0_10px_35px_rgba(0,0,0,0.015)] flex flex-col gap-4 relative">
              {loading ? (
                <div className="text-slate-400 text-center text-xs py-4 animate-pulse">{t.loadingActivity}</div>
              ) : latestActivities.length === 0 ? (
                <div className="text-slate-400 text-center text-xs py-4 font-semibold">{t.noRecentActivity}</div>
              ) : (
                <div className="relative border-l border-slate-100 ml-3 pl-6 space-y-6">
                  {latestActivities.map((act) => {
                    let badgeBg = "";
                    let dotBg = "";
                    
                    if (act.status === "Approved") {
                      badgeBg = "bg-emerald-50/80 text-emerald-700 border-emerald-200 shadow-sm shadow-emerald-500/[0.05]";
                      dotBg = "bg-emerald-500 ring-4 ring-emerald-100";
                    } else if (act.status === "Rejected") {
                      badgeBg = "bg-rose-50/80 text-rose-700 border-rose-200 shadow-sm shadow-rose-500/[0.05]";
                      dotBg = "bg-rose-500 ring-4 ring-rose-100";
                    } else if (act.status === "In Progress") {
                      badgeBg = "bg-cyan-50/80 text-cyan-700 border-cyan-200 shadow-sm shadow-cyan-500/[0.05]";
                      dotBg = "bg-cyan-500 ring-4 ring-cyan-100";
                    } else { // Pending
                      badgeBg = "bg-amber-50/80 text-amber-700 border-amber-200 shadow-sm shadow-amber-500/[0.05]";
                      dotBg = "bg-amber-500 ring-4 ring-amber-100";
                    }

                    return (
                      <div key={act._id} className="relative group transition-all duration-355 hover:translate-x-0.5">
                        {/* Timeline Node Dot */}
                        <div className={`absolute -left-[30px] top-1.5 w-4 h-4 rounded-full transition-transform duration-300 group-hover:scale-125 ${dotBg}`} />

                        <div className="flex justify-between items-center flex-wrap gap-2">
                          <div className="flex flex-col min-w-0">
                            <span className="font-extrabold text-sm text-slate-800 tracking-tight transition-colors group-hover:text-cyan-600">{act.claimNumber}</span>
                            <span className="text-[10px] text-slate-400 font-extrabold tracking-wider uppercase mt-0.5">{act.vehiclePlate}</span>
                          </div>

                          <span className={`px-3 py-1 rounded-full text-[10px] font-black border tracking-wide uppercase ${badgeBg}`}>
                            {act.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Contact Support Card Box */}
          <div className="bg-gradient-to-br from-cyan-50/90 via-sky-50/40 to-blue-50/20 border border-cyan-150/60 rounded-3xl p-6 shadow-md hover:shadow-lg hover:scale-[1.01] transition-all duration-300 relative overflow-hidden flex flex-col gap-4">
            
            {/* Pulsing online status indicator */}
            <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-emerald-50 border border-emerald-200/50 rounded-full px-3 py-1 select-none">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[9px] font-bold text-emerald-700 tracking-wide uppercase">Live Support</span>
            </div>

            <h3 className="text-cyan-800 font-extrabold text-lg tracking-tight flex items-center gap-2 select-none">
              <HugeiconsIcon icon={HelpCircleIcon} className="w-5 h-5 text-cyan-600" strokeWidth={2.5} />
              {t.supportHelpdesk}
            </h3>
            
            <p className="text-xs text-slate-500 font-semibold text-left leading-relaxed -mt-1 select-none">
              {t.supportDesc}
            </p>

            <div className="flex flex-col gap-2.5 mt-1">
              <a href="tel:+94112003000" className="flex items-center justify-between bg-white border border-slate-100/60 p-3 rounded-2xl hover:border-cyan-200 hover:shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 font-bold text-sm text-slate-800 group">
                <div className="flex items-center gap-2.5">
                  <span className="bg-cyan-50 p-2 rounded-xl text-cyan-600 transition-colors group-hover:bg-cyan-500 group-hover:text-white">
                    <HugeiconsIcon icon={Call02Icon} className="w-4 h-4" strokeWidth={2} />
                  </span>
                  <span className="text-slate-700 tracking-tight font-extrabold">+94 112 003 000</span>
                </div>
                <span className="text-[10px] bg-slate-50 border border-slate-150 px-3 py-1 rounded-full text-slate-400 group-hover:bg-cyan-50 group-hover:text-cyan-600 group-hover:border-cyan-200">
                  {t.line} 1
                </span>
              </a>

              <a href="tel:+94112003001" className="flex items-center justify-between bg-white border border-slate-100/60 p-3 rounded-2xl hover:border-cyan-200 hover:shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 font-bold text-sm text-slate-800 group">
                <div className="flex items-center gap-2.5">
                  <span className="bg-cyan-50 p-2 rounded-xl text-cyan-600 transition-colors group-hover:bg-cyan-500 group-hover:text-white">
                    <HugeiconsIcon icon={Call02Icon} className="w-4 h-4" strokeWidth={2} />
                  </span>
                  <span className="text-slate-700 tracking-tight font-extrabold">+94 112 003 001</span>
                </div>
                <span className="text-[10px] bg-slate-50 border border-slate-150 px-3 py-1 rounded-full text-slate-400 group-hover:bg-cyan-50 group-hover:text-cyan-600 group-hover:border-cyan-200">
                  {t.line} 2
                </span>
              </a>
            </div>
          </div>

        </div>

      </main>
      {/* Detailed Claim Modal & Sub-modals (Matching Branch Claims Portal layout) */}
      {selectedClaim && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
          
          {/* SUB-MODAL 1: DOCUMENTS */}
          {activeSubModal === "documents" && (
            <div className="bg-white border border-slate-200 rounded-[32px] w-full max-w-[800px] h-[650px] max-h-[90vh] shadow-2xl flex flex-col relative transition-all duration-300 overflow-hidden">
              {/* Header */}
              <div className="px-8 pt-6 pb-2 select-none bg-white">
                <h2 className="text-[24px] font-black text-slate-900 tracking-tight leading-none">
                  Documents - {selectedClaim.claimNumber}
                </h2>
              </div>
              <div className="border-b border-black mx-8 mb-6" />

              {/* Body */}
              <div className="px-8 pb-8 flex-1 overflow-y-auto space-y-6">
                <div className="text-left font-bold text-slate-800 space-y-1.5 text-[13px] select-none leading-relaxed">
                  <p>Vehicle No : <span className="font-medium text-slate-600">{formatPlate(selectedClaim.vehiclePlate)}</span></p>
                </div>

                {/* Categorized Document Lists */}
                <div className="space-y-6">
                  {/* Category 1: Policy Holder Documents */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-4">
                    <h3 className="text-sm font-black text-slate-800 border-b border-slate-200 pb-2 uppercase tracking-wider flex items-center gap-2 select-none">
                      <HugeiconsIcon icon={UserIcon} className="w-4 h-4 text-[#0f2d4a]" strokeWidth={2} />
                      Policy Holder Documents
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(() => {
                        const phDocs: { name: string; url: string }[] = [];
                        
                        // License & Accident Photos
                        const dlFront = selectedClaim.drivingLicense?.front?.[0];
                        const dlRear = selectedClaim.drivingLicense?.rear?.[0];
                        if (dlFront) phDocs.push({ name: "Driving License (Front)", url: dlFront });
                        if (dlRear) phDocs.push({ name: "Driving License (Rear)", url: dlRear });
                        
                        let photoIndex = 1;
                        const fPhotos = selectedClaim.accidentPhotos?.front || [];
                        const rPhotos = selectedClaim.accidentPhotos?.rear || [];
                        const sPhotos = selectedClaim.accidentPhotos?.side || [];
                        
                        fPhotos.forEach((url: string) => {
                          phDocs.push({ name: `Accident Photo ${photoIndex++} (Front)`, url });
                        });
                        rPhotos.forEach((url: string) => {
                          phDocs.push({ name: `Accident Photo ${photoIndex++} (Rear)`, url });
                        });
                        sPhotos.forEach((url: string) => {
                          phDocs.push({ name: `Accident Photo ${photoIndex++} (Side)`, url });
                        });
                        
                        (selectedClaim.additionalDocuments || []).forEach((doc) => {
                          const uploadedBy = doc.uploadedBy || "Policy Holder";
                          if (uploadedBy === "Policy Holder") {
                            phDocs.push({ name: doc.name, url: doc.url });
                          }
                        });

                        if (phDocs.length === 0) {
                          return <p className="text-xs text-slate-400 font-bold italic select-none col-span-2 py-2">No policy holder documents.</p>;
                        }

                        return phDocs.map((doc, idx) => {
                          let docUrl = doc.url;
                          if (docUrl && !docUrl.startsWith("http") && !docUrl.startsWith("data:")) {
                            docUrl = `${API_URL.replace("/api", "")}/uploads/${docUrl}`;
                          }
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setPreviewImage(docUrl || null)}
                              className="bg-white border border-slate-200 hover:bg-slate-50 transition-all p-4 rounded-[15px] flex items-center justify-start gap-3 cursor-pointer outline-none shadow-sm active:scale-98 text-left"
                            >
                              <HugeiconsIcon icon={Image01Icon} className="w-5 h-5 text-slate-600 flex-shrink-0" strokeWidth={2.5} />
                              <span className="text-xs font-extrabold text-slate-700 truncate">{doc.name}</span>
                            </button>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  {/* Category 2: Agent Documents & Upload Panel */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-4">
                    <h3 className="text-sm font-black text-slate-800 border-b border-slate-200 pb-2 uppercase tracking-wider flex items-center gap-2 select-none">
                      <HugeiconsIcon icon={UserIcon} className="w-4 h-4 text-cyan-600" strokeWidth={2} />
                      Agent Documents
                    </h3>

                    {/* Uploaded Agent Docs List */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(() => {
                        const agentDocs: { name: string; url?: string; textContent?: string }[] = [];
                        
                        if (selectedClaim.inspectionSubmitted && selectedClaim.inspectionReport) {
                          agentDocs.push({
                            name: "Inspection Report (Text)",
                            textContent: selectedClaim.inspectionReport
                          });
                        }

                        (selectedClaim.additionalDocuments || []).forEach((doc) => {
                          const uploadedBy = doc.uploadedBy || "Policy Holder";
                          if (uploadedBy === "Agent") {
                            agentDocs.push({ name: doc.name, url: doc.url });
                          }
                        });

                        if (agentDocs.length === 0) {
                          return <p className="text-xs text-slate-400 font-bold italic select-none col-span-2 py-2">No agent documents uploaded.</p>;
                        }

                        return agentDocs.map((doc, idx) => {
                          if (doc.textContent) {
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  alert(`--- Inspection Report ---\n\n${doc.textContent}`);
                                }}
                                className="bg-white border border-slate-200 hover:bg-slate-50 transition-all p-4 rounded-[15px] flex items-center justify-start gap-3 cursor-pointer outline-none shadow-sm active:scale-98 text-left"
                              >
                                <HugeiconsIcon icon={File01Icon} className="w-5 h-5 text-cyan-600 flex-shrink-0" strokeWidth={2.5} />
                                <span className="text-xs font-extrabold text-slate-700 truncate">{doc.name}</span>
                              </button>
                            );
                          }
                          let docUrl = doc.url;
                          if (docUrl && !docUrl.startsWith("http") && !docUrl.startsWith("data:")) {
                            docUrl = `${API_URL.replace("/api", "")}/uploads/${docUrl}`;
                          }
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setPreviewImage(docUrl || null)}
                              className="bg-white border border-slate-200 hover:bg-slate-50 transition-all p-4 rounded-[15px] flex items-center justify-start gap-3 cursor-pointer outline-none shadow-sm active:scale-98 text-left"
                            >
                              <HugeiconsIcon icon={Image01Icon} className="w-5 h-5 text-cyan-600 flex-shrink-0" strokeWidth={2.5} />
                              <span className="text-xs font-extrabold text-slate-700 truncate">{doc.name}</span>
                            </button>
                          );
                        });
                      })()}
                    </div>

                    {/* Agent File Upload Panel */}
                    {selectedClaim.status !== "Approved" && selectedClaim.status !== "Rejected" && (
                      <div className="border-t border-slate-200/60 pt-4 flex flex-col gap-4">
                        <span className="text-[11px] text-slate-500 font-extrabold uppercase tracking-wider select-none">Upload Claim Document</span>
                        
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider select-none">Document Type</label>
                          <div className="flex flex-wrap gap-2">
                            {["Repair Estimate", "Inspection Photos", "Damage Assessment", "Other"].map((type) => {
                              const isSelected = agentUploadDocName === type;
                              return (
                                <button
                                  key={type}
                                  type="button"
                                  onClick={() => setAgentUploadDocName(type)}
                                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all border cursor-pointer select-none ${
                                    isSelected
                                      ? "bg-red-650 border-red-650 text-white shadow-sm"
                                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                  }`}
                                >
                                  {type}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider select-none">File Attachment</label>
                          
                          <input
                            type="file"
                            ref={agentFileInputRef}
                            accept="image/*,application/pdf"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleFileChange(e.target.files[0]);
                              }
                            }}
                            className="hidden"
                          />

                          {!agentUploadFile ? (
                            <div
                              onClick={() => agentFileInputRef.current?.click()}
                              className="w-full border-2 border-dashed border-slate-300 hover:border-red-500 rounded-2xl py-6 px-4 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-red-50/5 cursor-pointer transition-all duration-150 group"
                            >
                              <HugeiconsIcon icon={Upload01Icon} className="w-8 h-8 text-slate-400 mb-2 group-hover:text-red-500 transition-colors" strokeWidth={1.8} />
                              <span className="text-slate-800 text-[13px] font-bold">Select document file</span>
                              <span className="text-slate-400 text-[10px] font-semibold mt-1">Image or PDF (Max 5MB)</span>
                            </div>
                          ) : (
                            <div className="w-full border-2 border-emerald-500 bg-emerald-50/5 rounded-2xl p-4 flex items-center justify-between relative shadow-sm">
                              <div className="flex items-center gap-3">
                                {agentUploadFile.type.startsWith("image/") && agentUploadPreview ? (
                                  <img
                                    src={agentUploadPreview}
                                    alt="preview"
                                    className="w-12 h-12 rounded-lg object-cover border border-slate-200 shadow-sm"
                                  />
                                ) : (
                                  <div className="w-11 h-11 rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-600 flex items-center justify-center">
                                    <HugeiconsIcon icon={File01Icon} className="w-5 h-5" strokeWidth={2.5} />
                                  </div>
                                )}
                                <div className="flex flex-col min-w-0 max-w-[200px] md:max-w-[280px]">
                                  <span className="text-emerald-800 text-[13px] font-bold truncate">
                                    {agentUploadFile.name}
                                  </span>
                                  <span className="text-slate-400 text-[10px] font-semibold mt-0.5">
                                    {(agentUploadFile.size / 1024 / 1024).toFixed(2)} MB
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleFileChange(null)}
                                className="bg-red-550 hover:bg-red-100 text-red-500 border border-red-200 rounded-full p-2 transition-colors cursor-pointer border-none"
                                title="Remove file"
                              >
                                <HugeiconsIcon icon={Delete02Icon} className="w-5 h-5" strokeWidth={2.2} />
                              </button>
                            </div>
                          )}
                        </div>

                        {agentUploadFile && (
                          <button
                            onClick={handleAgentUpload}
                            disabled={isAgentUploading}
                            className="w-full bg-red-650 hover:bg-red-700 text-white font-extrabold text-xs py-3 px-4 rounded-xl border-none cursor-pointer active:scale-[0.98] transition-all disabled:opacity-50 mt-1 shadow-md flex items-center justify-center gap-2"
                          >
                            {isAgentUploading ? "Uploading..." : "Upload Document to Claim"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-8 py-4 bg-white border-t border-slate-200 flex justify-end flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveSubModal(null)}
                  className="bg-[#000080] hover:bg-[#000066] text-white font-bold text-sm px-6 py-2 rounded-full transition-all border-none cursor-pointer flex items-center shadow-sm active:scale-95"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* MAIN DETAILS MODAL */}
          {activeSubModal === null && (
            <div className="bg-white border border-slate-200 rounded-[32px] w-full max-w-[780px] max-h-[90vh] p-8 shadow-2xl relative flex flex-col transition-all duration-300 select-none">
              
              {/* Close Button X */}
              <button
                type="button"
                onClick={() => setSelectedClaim(null)}
                className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-all cursor-pointer border-none bg-transparent"
                title="Close"
              >
                <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" strokeWidth={2.5} />
              </button>

              {/* Header: Title, Tags & Avatar */}
              <div className="flex items-start justify-between gap-4">
                <div className="overflow-hidden">
                  <h2 className="font-black text-slate-800 text-xl tracking-tight truncate">
                    {getPolicyHolderName(selectedClaim.userNic)}
                  </h2>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="border border-amber-300 text-amber-700 bg-amber-50/50 rounded-lg px-3 py-1 text-[10px] font-black uppercase tracking-wider">
                      ID: {selectedClaim.claimNumber}
                    </span>
                    <span className={`border rounded-lg px-3 py-1 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                      selectedClaim.status.toLowerCase() === "pending"
                        ? "border-amber-300 text-amber-700 bg-amber-50/50"
                        : selectedClaim.status.toLowerCase() === "in progress"
                        ? "border-blue-300 text-blue-700 bg-blue-50/50"
                        : selectedClaim.status.toLowerCase() === "approved"
                        ? "border-emerald-300 text-emerald-700 bg-emerald-50/50"
                        : "border-red-300 text-red-700 bg-red-50/50"
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${
                        selectedClaim.status.toLowerCase() === "pending"
                          ? "bg-amber-500 animate-pulse"
                          : selectedClaim.status.toLowerCase() === "in progress"
                          ? "bg-blue-500"
                          : selectedClaim.status.toLowerCase() === "approved"
                          ? "bg-emerald-500"
                          : "bg-red-500"
                      }`} />
                      {selectedClaim.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-slate-100 my-5" />

              {/* Details Columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs md:text-sm font-semibold select-none leading-relaxed flex-1 overflow-y-auto pr-1">
                {/* Column 1: Policy Holder Details */}
                <div className="space-y-3.5 bg-slate-50 border border-slate-200 p-5 rounded-2xl">
                  <h3 className="text-slate-800 font-extrabold uppercase tracking-wider text-[11px] border-b border-slate-200 pb-2 mb-3 flex items-center gap-2">
                    <HugeiconsIcon icon={UserIcon} className="w-4 h-4 text-[#0f2d4a]" strokeWidth={2.5} />
                    Policy Holder Details
                  </h3>
                  <div className="space-y-3">
                    <div className="grid grid-cols-[100px_1fr] gap-2">
                      <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Email</span>
                      <span className="text-slate-700 font-black truncate">: {getPolicyHolderEmail(selectedClaim.userNic)}</span>
                    </div>
                    <div className="grid grid-cols-[100px_1fr] gap-2">
                      <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">NIC</span>
                      <span className="text-slate-700 font-black truncate">: {selectedClaim.userNic}</span>
                    </div>
                    <div className="grid grid-cols-[100px_1fr] gap-2">
                      <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Contact</span>
                      <span className="text-slate-700 font-black truncate">: {getPolicyHolderContact(selectedClaim.userNic)}</span>
                    </div>
                  </div>
                </div>

                {/* Column 2: Vehicle Details */}
                <div className="space-y-3.5 bg-slate-50 border border-slate-200 p-5 rounded-2xl">
                  <h3 className="text-slate-800 font-extrabold uppercase tracking-wider text-[11px] border-b border-slate-200 pb-2 mb-3 flex items-center gap-2">
                    <HugeiconsIcon icon={Car01Icon} className="w-4 h-4 text-[#0f2d4a]" strokeWidth={2.5} />
                    Vehicle Details
                  </h3>
                  <div className="space-y-3">
                    <div className="grid grid-cols-[100px_1fr] gap-2">
                      <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Vehicle No</span>
                      <span className="text-slate-700 font-black truncate">: {formatPlate(selectedClaim.vehiclePlate)}</span>
                    </div>
                    <div className="grid grid-cols-[100px_1fr] gap-2">
                      <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Branch</span>
                      <span className="text-slate-700 font-black truncate">: {selectedClaim.branch || "-"}</span>
                    </div>
                    <div className="grid grid-cols-[100px_1fr] gap-2">
                      <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Assigned Agent</span>
                      <span className="text-slate-700 font-black truncate">: {agentName || selectedClaim.assignedAgent || "-"}</span>
                    </div>
                  </div>
                </div>

                {/* Large Dedicated Section: Incident Details */}
                <div className="col-span-1 md:col-span-2 space-y-4 bg-slate-50 border border-slate-200 p-6 rounded-2xl">
                  <h3 className="text-slate-800 font-extrabold uppercase tracking-wider text-[11px] border-b border-slate-200 pb-2 mb-3 flex items-center gap-2">
                    <HugeiconsIcon icon={Alert02Icon} className="w-4 h-4 text-red-500" strokeWidth={2.5} />
                    Incident Details & Assessment
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="grid grid-cols-[110px_1fr] gap-2">
                        <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Damage Type</span>
                        <span className="text-slate-700 font-black truncate">: {selectedClaim.damageType || "-"}</span>
                      </div>
                      <div className="grid grid-cols-[110px_1fr] gap-2">
                        <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Incident Date</span>
                        <span className="text-slate-700 font-black truncate">: {formatDate(selectedClaim.incidentDate)} @ {selectedClaim.incidentTime}</span>
                      </div>
                      <div className="grid grid-cols-[110px_1fr] gap-2">
                        <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Est. Amount</span>
                        <span className="text-slate-700 font-black truncate">: {selectedClaim.amount ? `LKR ${selectedClaim.amount.toLocaleString()}` : "Not Assessed"}</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="grid grid-cols-[110px_1fr] gap-2 items-start">
                        <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Location</span>
                        <span className="text-slate-700 font-black whitespace-normal break-words leading-relaxed">: {selectedClaim.location || "-"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-3 flex flex-col gap-1">
                    <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Incident Description</span>
                    <span className="text-slate-900 font-semibold break-words leading-relaxed whitespace-pre-wrap mt-1">
                      {selectedClaim.description || "No description provided."}
                    </span>
                  </div>

                  {selectedClaim.rejectionReason && (
                    <div className="flex flex-col gap-1 border-t border-slate-200/60 pt-3 mt-3">
                      <span className="text-red-500 font-bold uppercase tracking-wider text-[10px]">Rejection Reason</span>
                      <span className="text-red-650 font-extrabold mt-1 text-sm">
                        {selectedClaim.rejectionReason}
                      </span>
                    </div>
                  )}

                  {/* Documents & Contact Info Actions Row */}
                  <div className="border-t border-slate-200 pt-4 flex items-center justify-start gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveSubModal("documents")}
                      className="bg-[#000080] hover:bg-[#000066] text-white font-extrabold text-xs py-3 px-5 rounded-xl cursor-pointer shadow-sm active:scale-95 transition-all flex items-center gap-1.5"
                    >
                      <HugeiconsIcon icon={File01Icon} className="w-4 h-4" strokeWidth={2.5} />
                      Documents ({selectedClaim.additionalDocuments?.length || 0})
                    </button>
                  </div>
                </div>

                {/* Other Vehicles Involved Section */}
                {selectedClaim.otherVehicleDetails && (
                  <div className="col-span-1 md:col-span-2 space-y-4 bg-slate-50 border border-slate-200 p-6 rounded-2xl">
                    <h3 className="text-slate-800 font-extrabold uppercase tracking-wider text-[11px] border-b border-slate-200 pb-2 mb-3 flex items-center gap-2 select-none">
                      <HugeiconsIcon icon={Car01Icon} className="w-4 h-4 text-[#0f2d4a]" strokeWidth={2.5} />
                      Other Vehicles Involved
                    </h3>

                    {Array.isArray(selectedClaim.otherVehicleDetails) ? (
                      selectedClaim.otherVehicleDetails.length === 0 ? (
                        <p className="text-xs text-slate-500 font-bold italic py-2 select-none">
                          No other vehicles were involved in this accident.
                        </p>
                      ) : (
                        <div className="space-y-4">
                          {selectedClaim.otherVehicleDetails.map((vehicle: any, idx: number) => (
                            <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                              <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider select-none">
                                Vehicle #{idx + 1} Details
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                <div>
                                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] select-none">Vehicle No</span>
                                  <p className="text-slate-800 font-extrabold mt-0.5">{formatPlate(vehicle.vehiclePlate) || "-"}</p>
                                </div>
                                <div>
                                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] select-none">Driver Name</span>
                                  <p className="text-slate-800 font-extrabold mt-0.5">{vehicle.driverName || "-"}</p>
                                </div>
                                <div>
                                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] select-none">Insurance Company</span>
                                  <p className="text-slate-800 font-extrabold mt-0.5">{vehicle.insuranceCompany || "-"}</p>
                                </div>
                                <div>
                                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] select-none">Policy Number</span>
                                  <p className="text-slate-800 font-extrabold mt-0.5">{vehicle.policyNumber || "-"}</p>
                                </div>
                              </div>

                              {/* License & Vehicle Photos */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                                {vehicle.licensePhotos && vehicle.licensePhotos.length > 0 && (
                                  <div className="space-y-2">
                                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] select-none">License Photos</span>
                                    <div className="flex flex-wrap gap-2">
                                      {vehicle.licensePhotos.map((url: string, pIdx: number) => {
                                        let docUrl = url;
                                        if (docUrl && !docUrl.startsWith("http") && !docUrl.startsWith("data:")) {
                                          docUrl = `${API_URL.replace("/api", "")}/uploads/${docUrl}`;
                                        }
                                        return (
                                          <div
                                            key={pIdx}
                                            onClick={() => setPreviewImage(docUrl || null)}
                                            className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 cursor-pointer shadow-sm hover:shadow active:scale-95 transition-all"
                                          >
                                            <img src={docUrl} className="w-full h-full object-cover" alt="License" />
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                                {vehicle.vehiclePhotos && vehicle.vehiclePhotos.length > 0 && (
                                  <div className="space-y-2">
                                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] select-none">Damage Photos</span>
                                    <div className="flex flex-wrap gap-2">
                                      {vehicle.vehiclePhotos.map((url: string, pIdx: number) => {
                                        let docUrl = url;
                                        if (docUrl && !docUrl.startsWith("http") && !docUrl.startsWith("data:")) {
                                          docUrl = `${API_URL.replace("/api", "")}/uploads/${docUrl}`;
                                        }
                                        return (
                                          <div
                                            key={pIdx}
                                            onClick={() => setPreviewImage(docUrl || null)}
                                            className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 cursor-pointer shadow-sm hover:shadow active:scale-95 transition-all"
                                          >
                                            <img src={docUrl} className="w-full h-full object-cover" alt="Damage" />
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    ) : (
                      (selectedClaim.otherVehicleDetails.vehiclePlate || selectedClaim.otherVehicleDetails.driverName) && (
                        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div>
                              <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] select-none">Vehicle No</span>
                              <p className="text-slate-800 font-extrabold mt-0.5">{formatPlate(selectedClaim.otherVehicleDetails.vehiclePlate) || "-"}</p>
                            </div>
                            <div>
                              <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] select-none">Driver Name</span>
                              <p className="text-slate-800 font-extrabold mt-0.5">{selectedClaim.otherVehicleDetails.driverName || "-"}</p>
                            </div>
                            <div>
                              <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] select-none">Insurance Company</span>
                              <p className="text-slate-800 font-extrabold mt-0.5">{selectedClaim.otherVehicleDetails.insuranceCompany || "-"}</p>
                            </div>
                            <div>
                              <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] select-none">Policy Number</span>
                              <p className="text-slate-800 font-extrabold mt-0.5">{selectedClaim.otherVehicleDetails.policyNumber || "-"}</p>
                            </div>
                          </div>

                          {/* Photos */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                            {selectedClaim.otherVehicleDetails.licensePhotos && selectedClaim.otherVehicleDetails.licensePhotos.length > 0 && (
                              <div className="space-y-2">
                                <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] select-none">License Photos</span>
                                <div className="flex flex-wrap gap-2">
                                  {selectedClaim.otherVehicleDetails.licensePhotos.map((url: string, pIdx: number) => {
                                    let docUrl = url;
                                    if (docUrl && !docUrl.startsWith("http") && !docUrl.startsWith("data:")) {
                                      docUrl = `${API_URL.replace("/api", "")}/uploads/${docUrl}`;
                                    }
                                    return (
                                      <div
                                        key={pIdx}
                                        onClick={() => setPreviewImage(docUrl || null)}
                                        className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 cursor-pointer shadow-sm hover:shadow active:scale-95 transition-all"
                                      >
                                        <img src={docUrl} className="w-full h-full object-cover" alt="License" />
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            {selectedClaim.otherVehicleDetails.vehiclePhotos && selectedClaim.otherVehicleDetails.vehiclePhotos.length > 0 && (
                              <div className="space-y-2">
                                <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] select-none">Damage Photos</span>
                                <div className="flex flex-wrap gap-2">
                                  {selectedClaim.otherVehicleDetails.vehiclePhotos.map((url: string, pIdx: number) => {
                                    let docUrl = url;
                                    if (docUrl && !docUrl.startsWith("http") && !docUrl.startsWith("data:")) {
                                      docUrl = `${API_URL.replace("/api", "")}/uploads/${docUrl}`;
                                    }
                                    return (
                                      <div
                                        key={pIdx}
                                        onClick={() => setPreviewImage(docUrl || null)}
                                        className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 cursor-pointer shadow-sm hover:shadow active:scale-95 transition-all"
                                      >
                                        <img src={docUrl} className="w-full h-full object-cover" alt="Damage" />
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}

                {/* Policy Holder Attachments / Photos Section */}
                {(() => {
                  const attachments: { name: string; url: string }[] = [];
                  
                  const dlFront = selectedClaim.drivingLicense?.front?.[0];
                  const dlRear = selectedClaim.drivingLicense?.rear?.[0];
                  if (dlFront) attachments.push({ name: "License (Front)", url: dlFront });
                  if (dlRear) attachments.push({ name: "License (Rear)", url: dlRear });
                  
                  let photoIndex = 1;
                  const fPhotos = selectedClaim.accidentPhotos?.front || [];
                  const rPhotos = selectedClaim.accidentPhotos?.rear || [];
                  const sPhotos = selectedClaim.accidentPhotos?.side || [];
                  
                  fPhotos.forEach((url: string) => {
                    attachments.push({ name: `Accident Front #${photoIndex++}`, url });
                  });
                  rPhotos.forEach((url: string) => {
                    attachments.push({ name: `Accident Rear #${photoIndex++}`, url });
                  });
                  sPhotos.forEach((url: string) => {
                    attachments.push({ name: `Accident Side #${photoIndex++}`, url });
                  });

                  return (
                    <div className="col-span-1 md:col-span-2 space-y-4 bg-slate-50 border border-slate-200 p-6 rounded-2xl">
                      <h3 className="text-slate-800 font-extrabold uppercase tracking-wider text-[11px] border-b border-slate-200 pb-2 mb-3 flex items-center gap-2">
                        <HugeiconsIcon icon={Image01Icon} className="w-5 h-5 text-[#0f2d4a]" strokeWidth={2.5} />
                        Policy Holder Attachments & Photos
                      </h3>

                      {attachments.length === 0 ? (
                        <p className="text-xs text-slate-500 font-bold italic select-none py-2">
                          No driving license or accident photos attached to this claim dossier.
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                          {attachments.map((doc, idx) => {
                            let docUrl = doc.url;
                            if (docUrl && !docUrl.startsWith("http") && !docUrl.startsWith("data:")) {
                              docUrl = `${API_URL.replace("/api", "")}/uploads/${docUrl}`;
                            }
                            return (
                              <div
                                key={idx}
                                onClick={() => setPreviewImage(docUrl || null)}
                                className="group cursor-pointer flex flex-col items-center"
                              >
                                <div className="w-full h-24 rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm group-hover:shadow transition-all relative">
                                  <img
                                    src={docUrl}
                                    alt={doc.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                                  />
                                </div>
                                <span className="text-[9px] text-slate-500 font-black text-center mt-2 uppercase tracking-wider truncate w-full px-1">
                                  {doc.name}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}


                {selectedClaim.inspectionSubmitted && selectedClaim.inspectionReport && (
                  <div className="col-span-1 md:col-span-2">
                    {renderPremiumInspectionReport(selectedClaim.inspectionReport)}
                  </div>
                )}

              </div>

              {/* Action Buttons: Accept / Decline */}
              {(selectedClaim.currentStep === 2 || selectedClaim.currentStep === 1) && selectedClaim.status !== "Approved" && selectedClaim.status !== "Rejected" && (
                <div className="flex items-center gap-4 mt-6 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleAcceptClaim(selectedClaim._id)}
                    disabled={isAcceptingClaim}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm py-4 rounded-full flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95 transition-all disabled:opacity-50 border-none"
                  >
                    <HugeiconsIcon icon={Tick01Icon} className="w-5 h-5" strokeWidth={2.5} />
                    {t.acceptAssignment}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeclineClaim(selectedClaim._id, selectedClaim.claimNumber)}
                    disabled={isAcceptingClaim}
                    className="flex-1 bg-red-650 hover:bg-red-750 text-white font-black text-sm py-4 rounded-full flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95 transition-all disabled:opacity-50 border-none"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" strokeWidth={2.5} />
                    {t.declineAssignment}
                  </button>
                </div>
              )}

              {/* Status Banner for Accepted (In Progress / Approved) Claims */}
              {selectedClaim.currentStep >= 3 && !selectedClaim.inspectionSubmitted && selectedClaim.status !== "Approved" && selectedClaim.status !== "Rejected" && (
                <div className="w-full bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mt-6 text-center select-none transition-all duration-300 flex-shrink-0">
                  <p className="text-emerald-800 text-xs md:text-sm font-black flex items-center justify-center gap-2">
                    <HugeiconsIcon icon={SmartPhone01Icon} className="w-5 h-5 animate-pulse" strokeWidth={2.5} />
                    {t.claimAccepted}
                  </p>
                  <p className="text-emerald-600 text-xs font-semibold mt-2 leading-relaxed">
                    {t.mobileAppNotice}
                  </p>
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* Preview Image Modal Overlay */}
      {previewImage && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm transition-all duration-300">
          <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl p-2 overflow-hidden shadow-2xl flex flex-col items-center">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 text-white bg-slate-900/60 hover:bg-slate-900 p-2 rounded-full border border-slate-700/50 transition-all select-none cursor-pointer z-10"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" strokeWidth={2.5} />
            </button>
            {previewImage.toLowerCase().endsWith(".pdf") ? (
              <iframe src={previewImage} className="w-[80vw] h-[80vh] border-none rounded-xl" title="PDF Document Preview" />
            ) : (
              <img src={previewImage} className="max-w-full max-h-[85vh] object-contain rounded-xl shadow" alt="Document Preview" />
            )}
          </div>
        </div>
      )}

      {/* Floating Chat Bubble / Support Helpdesk Chat */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {showSupportChat && (
          <div className="bg-white border border-slate-100 rounded-3xl w-[320px] md:w-[350px] shadow-2xl flex flex-col overflow-hidden duration-300">
            {/* Header */}
            <div className="bg-[#00ddff] text-black px-5 py-4 flex justify-between items-center font-bold">
              <span className="text-[15px] tracking-tight">Agent Helpdesk Live Chat</span>
              <button onClick={() => setShowSupportChat(false)} className="text-black/70 hover:text-black bg-black/5 hover:bg-black/10 p-2 rounded-full transition-colors cursor-pointer">
                <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" strokeWidth={2.5} />
              </button>
            </div>

            {/* Chat Body */}
            <div className="h-64 p-4 overflow-y-auto flex flex-col gap-3 text-xs bg-slate-50">
              {chatLogs.map((log, idx) => (
                <div
                  key={idx}
                  className={`max-w-[85%] rounded-2xl p-3 leading-normal shadow-sm ${
                    log.sender === "Agent (You)"
                      ? "bg-slate-900 text-white self-end rounded-tr-none"
                      : "bg-white text-slate-800 self-start border border-slate-100 rounded-tl-none"
                  }`}
                >
                  <div className="font-extrabold text-[9px] uppercase opacity-75 mb-0.5">{log.sender}</div>
                  <div className="font-semibold text-xs leading-normal">{log.text}</div>
                </div>
              ))}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendMessage} className="border-t border-slate-100 p-3 flex gap-2 bg-white">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400 font-semibold"
              />
              <button
                type="submit"
                className="bg-[#00ddff] text-black font-extrabold text-xs px-4 py-3 rounded-xl cursor-pointer shadow-sm active:scale-95 transition-all"
              >
                Send
              </button>
            </form>
          </div>
        )}

        {/* Chat Toggle Button */}
        <button
          onClick={() => setShowSupportChat(!showSupportChat)}
          className="bg-[#00ddff] hover:bg-[#00c5e3] text-white w-14 h-14 rounded-full flex items-center justify-center shadow-xl shadow-cyan-300/35 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer"
          aria-label="Toggle Live Helpdesk Chat"
        >
          <HugeiconsIcon icon={BubbleChatIcon} className="w-7 h-7 text-black" strokeWidth={2.2} />
        </button>
      </div>

      {/* Styled UI Redirect Modal Overlay */}
      {showMobileRedirect && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm transition-all duration-300">
          <div className="relative w-full max-w-md bg-white rounded-[32px] p-8 shadow-2xl flex flex-col items-center text-center">
            {/* Close Button */}
            <button
              onClick={() => setShowMobileRedirect(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-all border-none bg-transparent cursor-pointer"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="w-5 h-5" strokeWidth={2.5} />
            </button>

            {/* Glowing Mobile Icon */}
            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-5 relative">
              <span className="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-emerald-400 opacity-20"></span>
              <HugeiconsIcon icon={SmartPhone01Icon} className="w-8 h-8 relative z-10" strokeWidth={2.2} />
            </div>

            {/* Content */}
            <h3 className="text-slate-900 font-black text-xl tracking-tight leading-none">
              Claim Accepted Successfully!
            </h3>
            <p className="text-slate-500 text-xs md:text-sm font-semibold mt-4 leading-relaxed">
              To proceed with the vehicle physical damage inspection, snap photos, and submit reports, please open the **Sanasa Agent Mobile App** on your smartphone.
            </p>

            {/* Quick Steps */}
            <div className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl p-4 mt-5 text-left space-y-2.5">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block select-none">Next Steps:</span>
              <div className="flex gap-2.5 items-start text-xs font-semibold text-slate-700">
                <span className="w-5 h-5 rounded-full bg-[#0f2d4a] text-white flex items-center justify-center font-bold shrink-0 text-[10px] mt-0.5">1</span>
                <span className="leading-relaxed">Launch the Sanasa Agent app on your phone.</span>
              </div>
              <div className="flex gap-2.5 items-start text-xs font-semibold text-slate-700">
                <span className="w-5 h-5 rounded-full bg-[#0f2d4a] text-white flex items-center justify-center font-bold shrink-0 text-[10px] mt-0.5">2</span>
                <span className="leading-relaxed">Go to <strong>Active Claims</strong> tab or notifications.</span>
              </div>
              <div className="flex gap-2.5 items-start text-xs font-semibold text-slate-700">
                <span className="w-5 h-5 rounded-full bg-[#0f2d4a] text-white flex items-center justify-center font-bold shrink-0 text-[10px] mt-0.5">3</span>
                <span className="leading-relaxed">Tap on your newly accepted claim plate number.</span>
              </div>
              <div className="flex gap-2.5 items-start text-xs font-semibold text-slate-700">
                <span className="w-5 h-5 rounded-full bg-[#0f2d4a] text-white flex items-center justify-center font-bold shrink-0 text-[10px] mt-0.5">4</span>
                <span className="leading-relaxed">Submit the inspection details directly.</span>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setShowMobileRedirect(false)}
              className="w-full mt-6 bg-[#0f2d4a] hover:bg-[#193d61] text-white font-extrabold text-xs py-4 rounded-xl border-none cursor-pointer shadow-md hover:shadow-slate-900/10 active:scale-95 transition-all select-none"
            >
              {t.okayGotIt}
            </button>
          </div>
        </div>
      )}

      {showAvailabilityModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[9998] flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white border border-slate-100 rounded-[32px] shadow-[0_20px_50px_rgba(15,23,42,0.08)] overflow-hidden p-8 flex flex-col items-center text-center select-none zoom-in duration-200">
            {/* Header Icon */}
            <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center mb-5 text-[#f97316]">
              <HugeiconsIcon icon={UserIcon} className="w-8 h-8" strokeWidth={2.2} />
            </div>
            
            {/* Title */}
            <h2 className="font-extrabold text-xl text-slate-800 tracking-tight">{t.setAvailability}</h2>
            
            {/* Description */}
            <p className="text-slate-500 text-xs font-semibold mt-3.5 leading-relaxed max-w-[280px]">
              {t.setAvailabilityDesc}
            </p>
            
            {/* Buttons Container */}
            <div className="w-full flex flex-col gap-3 mt-8">
              <button
                onClick={() => {
                  toggleAvailability("Active");
                  sessionStorage.setItem("availability_prompted", "true");
                  setShowAvailabilityModal(false);
                }}
                className="w-full bg-[#22c55e] hover:bg-[#16a34a] text-white font-extrabold text-xs py-4 rounded-xl border-none cursor-pointer shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <span className="w-3 h-3 rounded-full bg-white animate-pulse" />
                {t.goOnline}
              </button>
              
              <button
                onClick={() => {
                  toggleAvailability("Offline");
                  sessionStorage.setItem("availability_prompted", "true");
                  setShowAvailabilityModal(false);
                }}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs py-4 rounded-xl border-none cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <span className="w-3 h-3 rounded-full bg-slate-400" />
                {t.remainOffline}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[9999] flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-white border border-slate-100 rounded-[32px] shadow-[0_20px_50px_rgba(15,23,42,0.08)] flex flex-col my-auto overflow-hidden max-h-[95vh] transition-all duration-300">
            <div className="overflow-y-auto flex-1 flex flex-col">
              {/* Header */}
              <div className="px-8 pt-8 pb-5 select-none relative flex-shrink-0 border-b border-slate-100/60 bg-slate-50/55">
                <h2 className="font-extrabold text-xl text-slate-800 tracking-tight flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                    <HugeiconsIcon icon={SquareLock02Icon} className="w-5 h-5" strokeWidth={2.5} />
                  </div>
                  {t.updatePassword}
                </h2>
                <p className="text-slate-600 text-xs font-semibold mt-2 leading-relaxed">
                  {t.updatePasswordDesc}
                </p>
              </div>

              {/* Form Content */}
              <form onSubmit={handlePasswordChange} className="p-8 flex flex-col gap-5">
                {passwordError && (
                  <div className="bg-red-50 text-red-600 text-xs font-bold p-4 rounded-2xl border border-red-100 flex items-center gap-3">
                    <HugeiconsIcon icon={Alert02Icon} className="w-5 h-5 text-red-500 flex-shrink-0" strokeWidth={2.5} />
                    <span>{passwordError}</span>
                  </div>
                )}
                {passwordSuccess && (
                  <div className="bg-emerald-50 text-emerald-600 text-xs font-bold p-4 rounded-2xl border border-emerald-100 flex items-center gap-3">
                    <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-5 h-5 text-emerald-500 flex-shrink-0" strokeWidth={2.5} />
                    <span>{passwordSuccess}</span>
                  </div>
                )}

                {/* Current Password Field */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-700 ml-1 uppercase tracking-wider">
                    {t.currentTempPassword} <span className="text-red-500 font-bold">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    placeholder="Enter current temp password"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm text-slate-850 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-400 transition-all duration-200 font-semibold bg-slate-50/30 hover:bg-slate-50 focus:bg-white"
                  />
                </div>

                {/* New Password Field */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-700 ml-1 uppercase tracking-wider">
                    {t.newPassword} <span className="text-red-500 font-bold">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    placeholder="Create your new password"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm text-slate-850 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-400 transition-all duration-200 font-semibold bg-slate-50/30 hover:bg-slate-50 focus:bg-white"
                  />

                  {/* Password Strength Section (Calm Minimalist Style with High Contrast) */}
                  {passwordForm.newPassword && (
                    <div className="mt-1.5 flex flex-col gap-2.5 p-4 rounded-2xl bg-slate-50/90 border border-slate-200 transition-all duration-300 select-none">
                      <div className="flex justify-between items-center text-xs text-slate-800">
                        <span className="font-extrabold">{t.passwordStrength}:</span>
                        <span className="font-extrabold uppercase tracking-wider text-slate-900">
                          {strength.label === "Weak" ? t.weak : strength.label === "Medium" ? t.medium : strength.label === "Strong" ? t.strong : strength.label === "Excellent" ? t.excellent : strength.label}
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div className={`h-full ${strength.color} ${strength.width} transition-all duration-350 rounded-full`} />
                      </div>
                      <div className="flex flex-col gap-1.5 text-[11px] font-bold mt-1.5">
                        <div className="flex items-center gap-1.5">
                          {passwordForm.newPassword.length >= 6 && passwordForm.newPassword.length <= 12 ? (
                            <span className="text-emerald-600 flex items-center gap-1.5">✓ {t.passReqLength}</span>
                          ) : (
                            <span className="text-red-600 flex items-center gap-1.5">✗ {t.passReqLength}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {/[0-9]/.test(passwordForm.newPassword) || /[^A-Za-z0-9]/.test(passwordForm.newPassword) ? (
                            <span className="text-emerald-600 flex items-center gap-1.5">✓ {t.passReqNumSpec}</span>
                          ) : (
                            <span className="text-red-600 flex items-center gap-1.5">✗ {t.passReqNumSpec}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {passwordForm.confirmPassword && passwordForm.newPassword === passwordForm.confirmPassword ? (
                            <span className="text-emerald-600 flex items-center gap-1.5">✓ {t.passReqMatch}</span>
                          ) : (
                            <span className="text-red-600 flex items-center gap-1.5">✗ {t.passReqMatch}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password Field */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-700 ml-1 uppercase tracking-wider">
                    {t.confirmNewPassword} <span className="text-red-500 font-bold">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    placeholder="Verify your new password"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm text-slate-850 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-400 transition-all duration-200 font-semibold bg-slate-50/30 hover:bg-slate-50 focus:bg-white"
                  />
                </div>

                {/* Action Button */}
                <button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="w-full mt-2 bg-[#000080] hover:bg-[#000066] active:scale-[0.98] text-white font-extrabold text-sm py-4 rounded-2xl shadow-sm transition-all border-none cursor-pointer flex items-center justify-center gap-2 select-none"
                >
                  {isUpdatingPassword ? (
                    <span className="flex items-center gap-2">
                      <HugeiconsIcon icon={Loading03Icon} className="animate-spin h-5 w-5 text-white" strokeWidth={2.5} />
                      {t.updating}
                    </span>
                  ) : (
                    t.setNewPassword
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
