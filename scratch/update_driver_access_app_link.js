const fs = require('fs');
const path = 'c:/Users/oshit/Desktop/SanasaInsuarance/frontend/app/driver-access/[token]/page.tsx';

let content = fs.readFileSync(path, 'utf8');

// 1. Add states and handlers
const stateMarker = '  // Active Tab\r\n  const [activeTab, setActiveTab] = useState<TabType>("home");';
const stateMarkerLF = '  // Active Tab\n  const [activeTab, setActiveTab] = useState<TabType>("home");';

const newStates = `
  // Mobile app vs Web preview detection
  const [showMobileAppPrompt, setShowMobileAppPrompt] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ua = navigator.userAgent || "";
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
    setIsMobileDevice(isMobile);

    const alreadyChosen = sessionStorage.getItem("sanasa_driver_preferred_view");
    // If opened on a mobile device and user hasn't explicitly chosen yet, prompt them
    if (isMobile && !alreadyChosen) {
      setShowMobileAppPrompt(true);
    }
  }, []);

  const handleLaunchMobileApp = () => {
    if (typeof window === "undefined" || !token) return;
    const ua = navigator.userAgent || "";
    const isAndroid = /Android/i.test(ua);
    const currentUrl = window.location.href;

    if (isAndroid) {
      // Android Intent URL: if installed, directly launches SClaim Go; if not installed, falls back safely to web preview!
      const intentUrl = \`intent://driver-access/\${token}#Intent;scheme=mobileapp;package=com.sanasainsurance.mobileapp;S.browser_fallback_url=\${encodeURIComponent(currentUrl)};end\`;
      window.location.href = intentUrl;
    } else {
      // iOS / other: attempt custom deep link scheme
      window.location.href = \`mobileapp://driver-access/\${token}\`;
    }
  };

  const handleContinueInWeb = () => {
    setShowMobileAppPrompt(false);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("sanasa_driver_preferred_view", "web");
    }
  };
`;

if (content.includes(stateMarker)) {
  content = content.replace(stateMarker, stateMarker + newStates);
  console.log('Added states (CRLF match)');
} else if (content.includes(stateMarkerLF)) {
  content = content.replace(stateMarkerLF, stateMarkerLF + newStates);
  console.log('Added states (LF match)');
} else {
  console.error('Could not find state marker');
  process.exit(1);
}

// 2. Replace banner
const bannerStart = '{/* Mobile App Launch Banner (Displays for easy 1-tap open in SClaim Go Mobile App) */}';
const bannerEnd = '      </div>\r\n\r\n      {/* 1. EXACT POLICYHOLDER NAVBAR';
const bannerEndLF = '      </div>\n\n      {/* 1. EXACT POLICYHOLDER NAVBAR';

const newBannerAndModal = `{/* Smart Mobile Launch / Web Preview Choice Modal */}
      {showMobileAppPrompt && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in slide-in-from-bottom duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#0d2a3a] via-[#0f3b54] to-[#0d2a3a] p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-500/25 border border-sky-400/30 flex items-center justify-center text-xl shadow-inner">
                  📱
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white leading-tight">Sanasa SClaim Go</h3>
                  <p className="text-sky-200 text-xs">Driver Authorization Pass</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleContinueInWeb}
                className="text-sky-300 hover:text-white text-base bg-sky-800/40 hover:bg-sky-700/50 rounded-full w-7 h-7 flex items-center justify-center border-none cursor-pointer"
                title="Continue in browser"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-3.5">
              <p className="text-slate-600 text-xs leading-relaxed">
                Choose how you would like to open your authorized vehicle access pass and claim services:
              </p>

              {/* Option 1: Mobile App */}
              <button
                type="button"
                onClick={handleLaunchMobileApp}
                className="w-full text-left p-4 rounded-2xl border-2 border-sky-500 bg-sky-50/60 hover:bg-sky-100/70 active:scale-[0.99] transition-all flex items-start gap-3.5 cursor-pointer group shadow-sm"
              >
                <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center text-base shrink-0 font-bold group-hover:scale-105 transition-transform shadow-md">
                  🚀
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs">Open in SClaim Go App</span>
                    <span className="bg-sky-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Installed</span>
                  </div>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Fastest experience with real-time camera upload, GPS tracking, and instant notifications.
                  </p>
                </div>
              </button>

              {/* Option 2: Web Preview */}
              <button
                type="button"
                onClick={handleContinueInWeb}
                className="w-full text-left p-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-[0.99] transition-all flex items-start gap-3.5 cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center text-base shrink-0 font-bold group-hover:scale-105 transition-transform">
                  🌐
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs">Continue in Web Browser</span>
                    <span className="bg-slate-100 text-slate-600 text-[9px] font-semibold px-2 py-0.5 rounded-full">Web Preview</span>
                  </div>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    No installation or download needed. Access everything immediately right in your browser.
                  </p>
                </div>
              </button>

              <div className="pt-1 text-center">
                <p className="text-[10px] text-slate-400">
                  Don't have the app? Use <strong>Web Preview</strong> to view vehicles and submit claims online.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Mobile App Launch Banner */}
      {!bannerDismissed && (
        <div className="bg-gradient-to-r from-[#0d2a3a] via-[#0f3b54] to-[#0d2a3a] text-white px-4 py-2 flex items-center justify-between text-xs border-b border-sky-800/40 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-sky-500/25 border border-sky-400/30 flex items-center justify-center text-sm">
              📱
            </div>
            <div>
              <p className="font-bold text-white text-[12px] leading-tight flex items-center gap-2">
                <span>SClaim Go Mobile App</span>
                <span className="bg-sky-400/20 text-sky-200 text-[9px] px-1.5 py-0.2 rounded font-medium">App Available</span>
              </p>
              <p className="text-sky-200 text-[10px] leading-tight hidden sm:block">Already installed? Tap to launch with your authorized pass.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLaunchMobileApp}
              className="px-3 py-1 bg-[#ff9800] hover:bg-[#f57c00] active:scale-95 text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1.5 border-none cursor-pointer"
            >
              <span>Open in Mobile App</span>
              <span className="text-[10px]">↗</span>
            </button>
            <button
              type="button"
              onClick={() => setBannerDismissed(true)}
              className="p-1 text-sky-300 hover:text-white text-xs border-none bg-transparent cursor-pointer ml-1"
              title="Dismiss banner"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 1. EXACT POLICYHOLDER NAVBAR`;

const bannerIdx = content.indexOf(bannerStart);
if (bannerIdx !== -1) {
  const nextNavbarIdx = content.indexOf('{/* 1. EXACT POLICYHOLDER NAVBAR', bannerIdx);
  if (nextNavbarIdx !== -1) {
    content = content.substring(0, bannerIdx) + newBannerAndModal + content.substring(nextNavbarIdx + '{/* 1. EXACT POLICYHOLDER NAVBAR'.length);
    console.log('Replaced banner and added modal');
  } else {
    console.error('Could not find next navbar');
    process.exit(1);
  }
} else {
  console.error('Could not find bannerStart');
  process.exit(1);
}

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully updated driver access page!');
