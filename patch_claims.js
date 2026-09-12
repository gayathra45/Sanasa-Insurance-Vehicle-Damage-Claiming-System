const fs = require("fs");
let code = fs.readFileSync("frontend/app/Office_Staff/Claims/page.tsx", "utf8");

// 1. Interface replacement
const oldAiInterface = `  aiAnalysis?: {
    isAnalyzed: boolean;
    damagedItems?: {
      item: string;
      damagePercentage: number;
      description: string;
    }[];
    overallDamagePercentage?: number;
    summary?: string;
  };`;

const newAiInterface = `  aiAnalysis?: {
    isAnalyzed: boolean;
    damagedItems?: {
      item: string;
      damagePercentage: number;
      description: string;
      action?: "Repair" | "Replace";
      estimatedPartCost?: number;
      estimatedLaborCost?: number;
      totalItemCost?: number;
    }[];
    overallDamagePercentage?: number;
    totalEstimatedPartsCost?: number;
    totalEstimatedLaborCost?: number;
    totalEstimatedCost?: number;
    currency?: string;
    summary?: string;
    analyzedAt?: string;
  };
  garageEstimateComparison?: {
    isCompared: boolean;
    garageDocumentUrl?: string;
    garageName?: string;
    garageEstimatedTotal?: number;
    aiEstimatedTotal?: number;
    costDifference?: number;
    costDifferencePercentage?: number;
    verdict?: string;
    matchConfidenceScore?: number;
    photoVerificationDetails?: {
      item: string;
      garageCost: number;
      aiCost: number;
      matchesAccidentPhotos: boolean;
      confidence: number;
      notes: string;
    }[];
    summary?: string;
    reviewedAt?: string;
    reviewedBy?: string;
  };`;

if (code.includes(oldAiInterface)) {
  code = code.replace(oldAiInterface, newAiInterface);
  console.log("1. Claim interface updated.");
}

// 2. Submodal and handlers
const oldSubModal = `const [activeSubModal, setActiveSubModal] = useState<"documents" | "contact" | "request_docs" | "add_note" | "update_tracking" | null>(null);`;
const newSubModal = `const [activeSubModal, setActiveSubModal] = useState<"documents" | "contact" | "request_docs" | "add_note" | "update_tracking" | "decision_approve" | "decision_reject" | null>(null);

  const [approvingAmount, setApprovingAmount] = useState<string>("");
  const [approvalNote, setApprovalNote] = useState<string>("");
  const [rejectionReasonChoice, setRejectionReasonChoice] = useState<string>("Damaged parts do not match accident photo evidence");
  const [customRejectionText, setCustomRejectionText] = useState<string>("");
  const [comparingGarage, setComparingGarage] = useState(false);

  const handleClaimDecision = async (action: "Approve" | "Reject") => {
    if (!selectedClaim) return;
    try {
      setUpdatingClaim(true);
      const reason = action === "Reject" 
        ? (customRejectionText.trim() ? `${rejectionReasonChoice}: ${customRejectionText.trim()}` : rejectionReasonChoice)
        : "";
      const amt = action === "Approve" ? (Number(approvingAmount) || selectedClaim.garageEstimateComparison?.garageEstimatedTotal || selectedClaim.aiAnalysis?.totalEstimatedCost || selectedClaim.amount || 0) : null;

      const res = await fetch(`${API_URL}/office-staff/claims/${encodeURIComponent(selectedClaim.claimNumber)}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          amount: amt,
          rejectionReason: reason,
          note: approvalNote
        })
      });

      const data = await res.json();
      if (res.ok) {
        setClaims(prev => prev.map(c => c.claimNumber === selectedClaim.claimNumber ? { ...c, ...data.claim } : c));
        setSelectedClaim(prev => prev && prev.claimNumber === selectedClaim.claimNumber ? { ...prev, ...data.claim } : prev);
        alert(`Claim successfully ${action === "Approve" ? "APPROVED" : "REJECTED"}!`);
        setActiveSubModal(null);
      } else {
        alert(data.error || `Failed to ${action.toLowerCase()} claim.`);
      }
    } catch (err) {
      console.error(err);
      alert(`An error occurred while trying to ${action.toLowerCase()} the claim.`);
    } finally {
      setUpdatingClaim(false);
    }
  };

  const handleCompareGarageEstimate = async (claimNumber: string) => {
    try {
      setComparingGarage(true);
      const res = await fetch(`${API_URL}/office-staff/claims/${encodeURIComponent(claimNumber)}/compare-garage-estimate`, {
        method: "POST"
      });
      const data = await res.json();
      if (res.ok) {
        setClaims(prev => prev.map(c => c.claimNumber === claimNumber ? { ...c, ...data.claim, garageEstimateComparison: data.garageEstimateComparison } : c));
        setSelectedClaim(prev => prev && prev.claimNumber === claimNumber ? { ...prev, ...data.claim, garageEstimateComparison: data.garageEstimateComparison } : prev);
        alert("Garage estimate comparison & photo cross-check completed successfully!");
      } else {
        alert(data.error || "Failed to compare garage estimate.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred during garage estimate comparison.");
    } finally {
      setComparingGarage(false);
    }
  };`;

if (code.includes(oldSubModal)) {
  code = code.replace(oldSubModal, newSubModal);
  console.log("2. Handlers added.");
}

// 3. handleRunAIAnalysis
const oldRunAI = `        setClaims((prevClaims) =>
          prevClaims.map((c) =>
            c.claimNumber === claimNumber
              ? { ...c, aiAnalysis: data.aiAnalysis }
              : c
          )
        );
        setSelectedClaim((prev) =>
          prev && prev.claimNumber === claimNumber
            ? { ...prev, aiAnalysis: data.aiAnalysis }
            : prev
        );`;

const newRunAI = `        const updatedData = data.claim || { aiAnalysis: data.aiAnalysis };
        setClaims((prevClaims) =>
          prevClaims.map((c) =>
            c.claimNumber === claimNumber
              ? { ...c, ...updatedData }
              : c
          )
        );
        setSelectedClaim((prev) =>
          prev && prev.claimNumber === claimNumber
            ? { ...prev, ...updatedData }
            : prev
        );`;

if (code.includes(oldRunAI)) {
  code = code.replace(oldRunAI, newRunAI);
  console.log("3. handleRunAIAnalysis updated.");
}

fs.writeFileSync("frontend/app/Office_Staff/Claims/page.tsx", code, "utf8");
console.log("Part 1 applied!");
