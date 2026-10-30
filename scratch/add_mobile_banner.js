const fs = require('fs');

const filePath = 'frontend/app/driver-access/[token]/page.tsx';
let code = fs.readFileSync(filePath, 'utf8');

const target = '{/* 1. EXACT POLICYHOLDER NAVBAR (Matching PolicyHolderNavbar component 100%) */}';

const banner = `{/* Mobile App Launch Banner (Displays for easy 1-tap open in SClaim Go Mobile App) */}
      <div className="bg-gradient-to-r from-[#0d2a3a] via-[#0f3b54] to-[#0d2a3a] text-white px-4 py-2 flex items-center justify-between text-xs border-b border-sky-800/40 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-sky-500/25 border border-sky-400/30 flex items-center justify-center text-sm">
            📱
          </div>
          <div>
            <p className="font-bold text-white text-[12px] leading-tight">SClaim Go Mobile App</p>
            <p className="text-sky-200 text-[10px] leading-tight hidden sm:block">Faster photo upload, instant claims & driver live chat</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={\`mobileapp://driver-access/\${token}\`}
            className="px-3 py-1 bg-[#ff9800] hover:bg-[#f57c00] active:scale-95 text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1.5 no-underline"
          >
            <span>Open in Mobile App</span>
            <span className="text-[10px]">↗</span>
          </a>
        </div>
      </div>

      `;

if (code.includes(target)) {
  code = code.replace(target, banner + target);
  fs.writeFileSync(filePath, code, 'utf8');
  console.log('Successfully inserted banner!');
} else {
  console.log('Target not found in page.tsx');
}
