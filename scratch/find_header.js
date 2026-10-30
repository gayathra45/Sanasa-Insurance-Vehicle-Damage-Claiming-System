const fs = require('fs');
const code = fs.readFileSync('frontend/app/driver-access/[token]/page.tsx', 'utf8');
const searchStr = 'h-[450px]';
const idx = code.indexOf(searchStr);
console.log('Search index:', idx);
if (idx !== -1) {
  const start = Math.max(0, idx - 150);
  const end = Math.min(code.length, idx + 250);
  console.log(code.substring(start, end));
}
