const fs = require('fs');
const path = require('path');

const webFilePath = path.join(__dirname, '..', 'frontend', 'app', 'driver-access', '[token]', 'page.tsx');
let webCode = fs.readFileSync(webFilePath, 'utf8');

// 1. Navbar "Open in Mobile App"
if (!webCode.includes('Open in Mobile App') && !webCode.includes('mobileapp://driver-access/')) {
  const targetNavbar = '<button\n            onClick={() => setActiveTab("new_claim")}\n            className="px-3 py-1 rounded-full text-xs font-semibold bg-[#ff9800] text-white whitespace-nowrap border-none"\n          >\n            New Claim\n          </button>';
  const replacementNavbar = `<a
            href={\`mobileapp://driver-access/\${token}\`}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#00ddff]/15 text-[#007b94] border border-[#00ddff]/40 hover:bg-[#00ddff] hover:text-black transition-all no-underline"
            title="Open in SClaim Go Mobile App"
          >
            <span>📱 Open App</span>
          </a>
          <button
            onClick={() => setActiveTab("new_claim")}
            className="px-3 py-1 rounded-full text-xs font-semibold bg-[#ff9800] text-white whitespace-nowrap border-none"
          >
            New Claim
          </button>`;
  if (webCode.includes(targetNavbar)) {
    webCode = webCode.replace(targetNavbar, replacementNavbar);
    console.log('Added Open App link to navbar');
  }
}

// 2. Replace Home header and stat cards so they are only displayed on Home tab,
// and add the respective Policy Holder header for vehicles, my_claims, digital_pass!
const headerToken = '<header className="relative w-full h-[450px]';
const headerStartIdx = webCode.indexOf(headerToken);
const homeTabToken = '{activeTab === "home" && (';
const homeTabIdx = webCode.indexOf(homeTabToken, headerStartIdx);

console.log('headerStartIdx:', headerStartIdx, 'homeTabIdx:', homeTabIdx);

if (headerStartIdx !== -1 && homeTabIdx !== -1) {
  // Find the comment preceding headerStartIdx if possible
  const commentToken = '{/* ========================================================================= */}\n      {/* 2. SIGNATURE CURVED HEADER BANNER';
  let cutStart = webCode.lastIndexOf(commentToken, headerStartIdx);
  if (cutStart === -1) cutStart = headerStartIdx;

  const newHeaderBlocks = `{/* ========================================================================= */}
      {/* 2. TAB-SPECIFIC SIGNATURE HEADERS (Each Tab Matches Its Policy Holder Screen) */}
      {/* ========================================================================= */}
      
      {/* HOME TAB: Full Hero Banner with Policyholder Association */}
      {activeTab === "home" && (
        <header className="relative w-full h-[450px] md:h-[420px] rounded-b-[60px] md:rounded-b-[90px] overflow-hidden shadow-[0_15px_30px_rgba(0,0,0,0.08)] bg-[url('/policy1.jpg')] bg-cover bg-center">
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/80 to-transparent" />
          <div className="relative z-10 max-w-7xl mx-auto h-full px-6 md:px-16 pt-10 pb-12 flex flex-col justify-between">
            <div>
              <div className="inline-block border-b-3 border-[#00ddff] pb-1.5 mb-2">
                <h2 className="text-white text-xl md:text-2xl font-bold tracking-tight">
                  Welcome back, {profile?.driverName} !
                </h2>
              </div>
              <p className="text-slate-200 text-[13px] md:text-sm font-normal tracking-wide mt-1">
                Your driver authorization is active under policyholder{" "}
                <strong className="text-white">{profile?.policyHolderName}</strong> for Sanasa{" "}
                <strong className="text-white">{profile?.branch}</strong> Branch.
              </p>
            </div>

            <div className="my-auto max-w-4xl mx-auto text-center px-4">
              <h1 className="text-base md:text-xl font-medium text-slate-100/90 leading-relaxed tracking-normal">
                An authorized third-party driver claim with Sanasa General Insurance Company Limited enables fast-track vehicle inspection and settlement for authorized vehicles.
              </h1>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap justify-center gap-3 sm:gap-6 mt-2 w-full max-w-md mx-auto">
              <button
                onClick={() => setActiveTab("new_claim")}
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-sm sm:text-base md:text-lg px-6 sm:px-10 py-3.5 sm:py-5 rounded-full transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] border-none flex-1 sm:flex-none text-center cursor-pointer"
                style={{ boxShadow: "0 8px 25px rgba(220, 38, 38, 0.65)" }}
              >
                New Claim
              </button>
              <button
                onClick={() => setActiveTab("digital_pass")}
                className="bg-[#1fcbf2] hover:bg-[#00b2d6] text-white font-bold text-sm sm:text-base md:text-lg px-6 sm:px-10 py-3.5 sm:py-5 rounded-full transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] border-none flex-1 sm:flex-none text-center cursor-pointer"
                style={{ boxShadow: "0 8px 25px rgba(31, 203, 242, 0.65)" }}
              >
                Digital Pass
              </button>
            </div>
          </div>
        </header>
      )}

      {/* MY VEHICLES TAB: Policy Holder MyVehicles Authentic Header */}
      {activeTab === "vehicles" && (
        <div className="max-w-7xl w-full mx-auto px-6 md:px-16 mt-8 relative">
          <div className="absolute top-0 bottom-0 left-[calc(50%-50vw)] right-6 md:right-12 bg-[url('/policy1.jpg')] bg-cover bg-center rounded-r-[75px] md:rounded-r-[95px] overflow-hidden shadow-md">
            <div className="absolute inset-0 bg-slate-900/35" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0d2a3a]/90 via-[#0d2a3a]/75 to-transparent" />
          </div>
          <header className="relative z-10 h-[210px] flex flex-col justify-center pl-4 md:pl-8 select-none">
            <h1 className="text-white text-3xl md:text-[40px] font-bold tracking-tight leading-none">
              My Vehicles
            </h1>
            <p className="text-slate-200 text-xs md:text-sm font-semibold mt-3.5 tracking-wide opacity-95">
              Authorized vehicles under policyholder {profile?.policyHolderName || "Policy Holder"}
            </p>
          </header>
        </div>
      )}

      {/* MY CLAIMS TAB: Policy Holder My_claims Authentic Header */}
      {activeTab === "my_claims" && (
        <div className="max-w-7xl w-full mx-auto px-6 md:px-16 mt-8 relative">
          <div className="absolute top-0 bottom-0 left-[calc(50%-50vw)] right-6 md:right-12 bg-[url('/myclaim.png')] bg-cover bg-center rounded-r-[75px] md:rounded-r-[95px] overflow-hidden shadow-md">
            <div className="absolute inset-0 bg-slate-900/35" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0d2a3a]/90 via-[#0d2a3a]/75 to-transparent" />
          </div>
          <header className="relative z-10 h-[210px] flex flex-col justify-center pl-4 md:pl-8 select-none">
            <h1 className="text-white text-3xl md:text-[40px] font-bold tracking-tight leading-none">
              My Claims
            </h1>
            <p className="text-slate-200 text-xs md:text-sm font-normal mt-3.5 tracking-wide opacity-95">
              Track and manage all third-party insurance claims in one place
            </p>
          </header>
        </div>
      )}

      {/* DIGITAL PASS TAB: Policy Holder Style Digital Pass Header */}
      {activeTab === "digital_pass" && (
        <div className="max-w-7xl w-full mx-auto px-6 md:px-16 mt-8 relative">
          <div className="absolute top-0 bottom-0 left-[calc(50%-50vw)] right-6 md:right-12 bg-gradient-to-r from-[#0d2a3a] via-[#103a52] to-[#0d2a3a] rounded-r-[75px] md:rounded-r-[95px] overflow-hidden shadow-md">
            <div className="absolute inset-0 bg-slate-900/40" />
            <div className="absolute inset-0 bg-[radial-gradient(#00ddff_1px,transparent_1px)] [background-size:16px_16px] opacity-15" />
          </div>
          <header className="relative z-10 h-[210px] flex flex-col justify-center pl-4 md:pl-8 select-none">
            <h1 className="text-white text-3xl md:text-[40px] font-bold tracking-tight leading-none">
              Official Digital Driver Pass
            </h1>
            <p className="text-slate-200 text-xs md:text-sm font-semibold mt-3.5 tracking-wide opacity-95">
              Authorized credentials verified by Sanasa General Insurance ({profile?.branch} Branch)
            </p>
          </header>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MAIN CONTAINER & HOME STAT CARDS */}
      {/* ========================================================================= */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 md:px-16 py-8 md:py-10 relative z-20">
        
        {/* Three Stat Cards - ONLY DISPLAYED ON HOME TAB */}
        {activeTab === "home" && (
          <section className="-mt-[60px] md:-mt-[50px] grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <button
              onClick={() => setActiveTab("my_claims")}
              className="bg-white px-5 py-6 rounded-[24px] border border-slate-100 shadow-[0_12px_32px_rgba(0,0,0,0.06)] flex items-center justify-start gap-4 hover:shadow-[0_12px_32px_rgba(0,0,0,0.1)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-left border-none cursor-pointer"
            >
              <div className="text-slate-400 flex-shrink-0">
                <HugeiconsIcon icon={Analytics01Icon} className="w-11 h-11 text-orange-500" strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-3xl font-bold text-slate-800 tracking-tight leading-none mb-1">{claims.length}</h3>
                <p className="text-slate-500 font-semibold text-[10px] md:text-xs uppercase tracking-wider leading-tight">Total Claims</p>
              </div>
            </button>

            <button
              onClick={() => setActiveTab("my_claims")}
              className="bg-white px-5 py-6 rounded-[24px] border border-slate-100 shadow-[0_12px_32px_rgba(0,0,0,0.06)] flex items-center justify-start gap-4 hover:shadow-[0_12px_32px_rgba(0,0,0,0.1)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-left border-none cursor-pointer"
            >
              <div className="text-slate-400 flex-shrink-0">
                <HugeiconsIcon icon={Clock01Icon} className="w-11 h-11 text-cyan-500" strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-3xl font-bold text-slate-800 tracking-tight leading-none mb-1">{pendingClaimsCount}</h3>
                <p className="text-slate-500 font-semibold text-[10px] md:text-xs uppercase tracking-wider leading-tight">In Progress</p>
              </div>
            </button>

            <button
              onClick={() => setActiveTab("my_claims")}
              className="bg-white px-5 py-6 rounded-[24px] border border-slate-100 shadow-[0_12px_32px_rgba(0,0,0,0.06)] flex items-center justify-start gap-4 hover:shadow-[0_12px_32px_rgba(0,0,0,0.1)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-left border-none cursor-pointer"
            >
              <div className="text-slate-400 flex-shrink-0">
                <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-11 h-11 text-emerald-500" strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-3xl font-bold text-slate-800 tracking-tight leading-none mb-1">{approvedClaimsCount}</h3>
                <p className="text-slate-500 font-semibold text-[10px] md:text-xs uppercase tracking-wider leading-tight">Approved Claims</p>
              </div>
            </button>
          </section>
        )}
        
        `;

  webCode = webCode.slice(0, cutStart) + newHeaderBlocks + webCode.slice(homeTabIdx);
  console.log('Successfully updated web headers structure!');
}

// 3. In My Claims tab, add the 2 Overview cards at the top (matching Policy Holder My_claims):
const myClaimsAnchor = `{activeTab === "my_claims" && (\n          <section className="flex flex-col gap-6">`;
const myClaimsOverviewCards = `{activeTab === "my_claims" && (
          <section className="flex flex-col gap-6">
            
            {/* Top Overview Cards Grid (Policy Holder My_claims standard) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 select-none -mt-2 mb-2">
              {/* Card 1: Driver Profile & Verification */}
              <div className="bg-white border border-slate-200/80 rounded-[28px] p-6 shadow-sm flex flex-col justify-between min-h-[140px] hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">Authorized Driver Profile</span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Verified Driver
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-2">
                  <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-200 flex items-center justify-center text-slate-700 font-bold shrink-0 shadow-inner">
                    <HugeiconsIcon icon={UserIcon} className="w-6 h-6 text-slate-700" strokeWidth={1.8} />
                  </div>
                  <div className="overflow-hidden">
                    <span className="block font-semibold text-slate-800 text-base truncate">
                      {profile?.driverName}
                    </span>
                    <span className="inline-block bg-slate-100 text-slate-600 text-[11px] font-bold px-2.5 py-0.5 rounded-md mt-1">
                      NIC: {profile?.driverNicMasked || "Verified"} • {profile?.branch} Branch
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2: Performance & Claims Summary */}
              <div className="bg-white border border-slate-200/80 rounded-[28px] p-6 shadow-sm flex flex-col justify-between min-h-[140px] hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">Claims Performance</span>
                  <span className="text-[11px] font-semibold text-slate-400">
                    Year {new Date().getFullYear()}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center mt-2">
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-2.5 flex flex-col justify-center items-center">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total</span>
                    <span className="text-2xl font-bold text-slate-900">{claims.length}</span>
                  </div>
                  <div className="bg-sky-50/70 border border-sky-100 rounded-2xl p-2.5 flex flex-col justify-center items-center">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-sky-700">Pending</span>
                    <span className="text-2xl font-bold text-sky-800">{pendingClaimsCount}</span>
                  </div>
                  <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-2.5 flex flex-col justify-center items-center">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Approved</span>
                    <span className="text-2xl font-bold text-emerald-800">{approvedClaimsCount}</span>
                  </div>
                </div>
              </div>
            </div>`;

if (webCode.includes(myClaimsAnchor)) {
  webCode = webCode.replace(myClaimsAnchor, myClaimsOverviewCards);
  console.log('Successfully injected My_claims overview cards into page.tsx');
}

fs.writeFileSync(webFilePath, webCode, 'utf8');
console.log('Saved frontend driver-access page.tsx successfully');
