const fs = require('fs');
const path = require('path');
const os = require('os');

// Helper to find the local machine IP on the network
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  
  // Look for active Wi-Fi or Ethernet interfaces first
  for (const name of Object.keys(interfaces)) {
    const isLocalAdapter = ['wi-fi', 'wireless', 'ethernet', 'lan', 'wlan'].some(term => name.toLowerCase().includes(term));
    if (isLocalAdapter) {
      for (const net of interfaces[name]) {
        if (net.family === 'IPv4' && !net.internal) {
          return net.address;
        }
      }
    }
  }

  // Fallback to any external IPv4 address
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }

  return '127.0.0.1';
}

const currentIp = getLocalIp();
console.log(`[IP Config Helper] Detected machine IP address: ${currentIp}`);

const rootDir = __dirname;

// 1. Update frontend/.env
const frontendEnvPath = path.join(rootDir, 'frontend', '.env');
if (fs.existsSync(frontendEnvPath)) {
  let content = fs.readFileSync(frontendEnvPath, 'utf8');
  const updatedContent = content.replace(
    /NEXT_PUBLIC_API_URL=http:\/\/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}|localhost|127\.0\.0\.1):5000\/api/g,
    `NEXT_PUBLIC_API_URL=http://${currentIp}:5000/api`
  );
  if (content !== updatedContent) {
    fs.writeFileSync(frontendEnvPath, updatedContent, 'utf8');
    console.log(`[IP Config Helper] Updated ${frontendEnvPath} with new IP.`);
  } else {
    console.log(`[IP Config Helper] ${frontendEnvPath} is already up to date.`);
  }
} else {
  console.log(`[IP Config Helper] Warning: ${frontendEnvPath} not found.`);
}

// 2. Update mobile_app/app/_config.ts fallback URL
const mobileConfigPath = path.join(rootDir, 'mobile_app', 'app', '_config.ts');
if (fs.existsSync(mobileConfigPath)) {
  let content = fs.readFileSync(mobileConfigPath, 'utf8');
  const updatedContent = content.replace(
    /let url = "http:\/\/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}|localhost|127\.0\.0\.1):5000";/g,
    `let url = "http://${currentIp}:5000";`
  );
  if (content !== updatedContent) {
    fs.writeFileSync(mobileConfigPath, updatedContent, 'utf8');
    console.log(`[IP Config Helper] Updated ${mobileConfigPath} with new IP.`);
  } else {
    console.log(`[IP Config Helper] ${mobileConfigPath} is already up to date.`);
  }
} else {
  console.log(`[IP Config Helper] Warning: ${mobileConfigPath} not found.`);
}
