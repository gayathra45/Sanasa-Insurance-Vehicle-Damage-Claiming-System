const fs = require('fs');
const file = 'mobile_app/app/driver-access/[token].tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(
  '<StatusBar barStyle="light-content" backgroundColor="#0f172a" />',
  '<StatusBar barStyle="light-content" {...({ backgroundColor: "#0f172a" } as any)} />'
);
fs.writeFileSync(file, content, 'utf8');
console.log('Fixed StatusBar successfully!');
