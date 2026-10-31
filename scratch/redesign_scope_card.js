const fs = require('fs');
const path = require('path');

const targetPath = path.resolve('c:/Users/oshit/Desktop/SanasaInsuarance/frontend/app/driver-access/[token]/page.tsx');
let content = fs.readFileSync(targetPath, 'utf8');

const originalHadCRLF = content.includes('\r\n');
content = content.replace(/\r\n/g, '\n');

const oldCardTarget = `              {/* Third-Party Driver Scope & Limitations Card */}
              <div className="mt-8 bg-white border border-slate-200/80 rounded-[28px] p-6 shadow-sm">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                    <HugeiconsIcon icon={SecurityCheckIcon} className="w-5 h-5" strokeWidth={2} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Driver Authorization Scope & Limitations
                    </h3>
                    <p className="text-xs text-slate-500">
                      Underwriter rules established under Policyholder <strong className="text-slate-700">{profile?.policyHolderName}</strong>
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs mt-3">
                  {/* Authorized Rights */}
                  <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/70 space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-800 uppercase tracking-wide text-[11px]">
                      <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-4 h-4 text-emerald-600" />
                      <span>Authorized Scope (Allowed)</span>
                    </div>
                    <ul className="space-y-1.5 text-emerald-950/85">
                      <li className="flex items-start gap-1.5">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>Drive assigned vehicle(s) on public roads across Sri Lanka.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>File accident & vehicle damage claims directly with photos.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>Present live cryptographic QR Digital Pass to traffic authorities.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>Chat directly with Vehicle Owner (Policyholder), Branch Officers & Field Agents.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>24/7 Sanasa Customer & Emergency Hotline support (+94 112 003 000).</span>
                      </li>
                    </ul>
                  </div>

                  {/* Policyholder Limitations */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-slate-700 uppercase tracking-wide text-[11px]">
                      <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4 text-rose-500" />
                      <span>Access Limitations (Restricted)</span>
                    </div>
                    <ul className="space-y-1.5 text-slate-600">
                      <li className="flex items-start gap-1.5">
                        <span className="text-rose-500 font-bold">✕</span>
                        <span>Cannot alter insurance policy terms, coverages, or premiums.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-rose-500 font-bold">✕</span>
                        <span>Cannot renew or transfer vehicle insurance policies.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-rose-500 font-bold">✕</span>
                        <span>Cannot register additional drivers or revoke passes.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="text-rose-500 font-bold">✕</span>
                        <span>Cannot access policyholder's private financial data.</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>`;

const newCardReplacement = `              {/* Third-Party Driver Scope & Limitations Card (Redesigned with Premium Elevation) */}
              <div className="mt-8 bg-white border border-slate-200/90 rounded-[32px] p-6 sm:p-7 shadow-[0_10px_35px_rgba(0,0,0,0.03)] relative overflow-hidden select-none">
                {/* Subtle Ambient Decorative Gradients */}
                <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-sky-100/40 via-indigo-50/20 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-emerald-100/30 via-slate-50/20 to-transparent rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

                {/* Card Header */}
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#0d2a3a] via-[#103a52] to-[#0284c7] text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-sky-900/20">
                      <HugeiconsIcon icon={SecurityCheckIcon} className="w-6 h-6 text-cyan-300" strokeWidth={2.2} />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-snug">
                          Driver Authorization Scope & Limitations
                        </h3>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 text-white shadow-2xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>Underwriter Verified</span>
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Established under Policyholder <strong className="text-slate-800 font-semibold">{profile?.policyHolderName}</strong> • {profile?.branch} Branch
                      </p>
                    </div>
                  </div>

                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 font-medium">
                    <HugeiconsIcon icon={ShieldCheckIcon} className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Sri Lanka Motor Traffic Act Compliant</span>
                  </div>
                </div>

                {/* Scope & Limitations 2-Column Grid */}
                <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
                  
                  {/* Left Column: Authorized Scope (Allowed) */}
                  <div className="bg-gradient-to-b from-emerald-50/70 via-emerald-50/20 to-white border border-emerald-200/80 rounded-[26px] p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
                    <div>
                      {/* Section Title */}
                      <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-emerald-200/60">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-bold tracking-wide uppercase shadow-xs shadow-emerald-600/25">
                          <HugeiconsIcon icon={CheckmarkCircle01Icon} className="w-3.5 h-3.5" strokeWidth={2.5} />
                          <span>Authorized Scope (Allowed)</span>
                        </div>
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                          5 Active Rights
                        </span>
                      </div>

                      {/* Items List */}
                      <div className="space-y-3">
                        {[
                          "Drive assigned vehicle(s) on public roads across Sri Lanka.",
                          "File accident & vehicle damage claims directly with photos.",
                          "Present live cryptographic QR Digital Pass to traffic authorities.",
                          "Chat directly with Vehicle Owner (Policyholder), Branch Officers & Field Agents.",
                          "24/7 Sanasa Customer & Emergency Hotline support (+94 112 003 000)."
                        ].map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-3 p-2 rounded-xl hover:bg-emerald-100/30 transition-colors"
                          >
                            <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs shadow-emerald-500/30">
                              <HugeiconsIcon icon={Tick01Icon} className="w-3 h-3" strokeWidth={3} />
                            </div>
                            <span className="text-slate-800 text-xs sm:text-[13px] font-medium leading-relaxed">
                              {item}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-emerald-100 flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>Full legal coverage applies while driving assigned vehicles</span>
                    </div>
                  </div>

                  {/* Right Column: Access Limitations (Restricted) */}
                  <div className="bg-gradient-to-b from-rose-50/70 via-rose-50/20 to-white border border-rose-200/80 rounded-[26px] p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
                    <div>
                      {/* Section Title */}
                      <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-rose-200/60">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500 text-white text-[11px] font-bold tracking-wide uppercase shadow-xs shadow-rose-500/25">
                          <HugeiconsIcon icon={Cancel01Icon} className="w-3.5 h-3.5" strokeWidth={2.5} />
                          <span>Access Limitations (Restricted)</span>
                        </div>
                        <span className="text-[11px] font-bold text-rose-700 bg-rose-100/70 px-2 py-0.5 rounded-md">
                          4 Restrictions
                        </span>
                      </div>

                      {/* Items List */}
                      <div className="space-y-3">
                        {[
                          "Cannot alter insurance policy terms, coverages, or premiums.",
                          "Cannot renew or transfer vehicle insurance policies.",
                          "Cannot register additional drivers or revoke passes.",
                          "Cannot access policyholder's private financial data."
                        ].map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-3 p-2 rounded-xl hover:bg-rose-100/30 transition-colors"
                          >
                            <div className="w-5 h-5 rounded-full bg-rose-100 text-rose-600 border border-rose-300 flex items-center justify-center shrink-0 mt-0.5">
                              <HugeiconsIcon icon={Cancel01Icon} className="w-3 h-3" strokeWidth={2.5} />
                            </div>
                            <span className="text-slate-700 text-xs sm:text-[13px] font-medium leading-relaxed">
                              {item}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-rose-100 flex items-center gap-1.5 text-[11px] text-rose-600 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                      <span>Security isolation protects policyholder account privacy</span>
                    </div>
                  </div>

                </div>

                {/* Bottom Trust Seal Footer */}
                <div className="relative z-10 mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <HugeiconsIcon icon={ShieldCheckIcon} className="w-4 h-4 text-cyan-600" />
                    <span>Verified under Sanasa General Insurance Company Limited Policy Framework</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <HugeiconsIcon icon={Call02Icon} className="w-3.5 h-3.5 text-slate-500" />
                    <span className="font-mono text-slate-600 font-semibold">Hotline: +94 112 003 000</span>
                  </div>
                </div>
              </div>`;

if (content.includes(oldCardTarget)) {
  content = content.replace(oldCardTarget, newCardReplacement);
  console.log('Successfully replaced Scope & Limitations section!');
} else {
  console.error('Could not find oldCardTarget');
}

if (originalHadCRLF) {
  content = content.replace(/\n/g, '\r\n');
}

fs.writeFileSync(targetPath, content, 'utf8');
