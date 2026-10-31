const fs = require('fs');
const path = 'frontend/app/Components/AIChatBot.tsx';

let content = fs.readFileSync(path, 'utf8');

// 1. Add driver-access to role detection
const roleAdminTarget = `    } else if (pathname?.includes("/Admin/")) {
      setCurrentRole("admin");
      setUserInfo({ name: "Administrator", nic: "", email: "", branch: "" });
    } else {`;

const roleAdminReplacement = `    } else if (pathname?.includes("/Admin/")) {
      setCurrentRole("admin");
      setUserInfo({ name: "Administrator", nic: "", email: "", branch: "" });
    } else if (pathname?.includes("/driver-access")) {
      let dName = "Authorized Driver";
      try {
        const dStr = sessionStorage.getItem("sanasa_tp_driver_profile");
        if (dStr) {
          const d = JSON.parse(dStr);
          dName = d.driverName || "Authorized Driver";
        }
      } catch {}
      setCurrentRole("policy_holder");
      setUserInfo({ name: dName, nic: "", email: "", branch: "" });
      setThreads((prev) => ({
        ...prev,
        policy_holder: prev.policy_holder.length > 0 ? prev.policy_holder : getInitialWelcome("policy_holder", dName),
      }));
    } else {`;

const roleTargetCRLF = roleAdminTarget.replace(/\r?\n/g, '\r\n');
const roleTargetLF = roleAdminTarget.replace(/\r?\n/g, '\n');

if (content.includes(roleTargetCRLF)) {
  content = content.replace(roleTargetCRLF, roleAdminReplacement.replace(/\r?\n/g, '\r\n'));
  console.log('Updated role detection (CRLF)');
} else if (content.includes(roleTargetLF)) {
  content = content.replace(roleTargetLF, roleAdminReplacement.replace(/\r?\n/g, '\n'));
  console.log('Updated role detection (LF)');
} else {
  console.error('Could not find roleAdminTarget');
}

// 2. Update hasExistingBottomChat and isExcluded
const excludedTarget = `  // Avoid clashing with existing bottom-8 right-8 support chat icon on portal pages
  const hasExistingBottomChat = Boolean(
    pathname?.includes("/Agent/") ||
    pathname?.includes("/Policy_Holder/") ||
    pathname?.includes("/Office_Staff/") ||
    pathname?.includes("/Admin/")
  );

  // User instructions: exclude claim apply process, login pages, and driver access portal
  const isExcluded = Boolean(
    pathname?.includes("/Policy_Holder/New_Claim") ||
    pathname === "/Login" ||
    pathname?.toLowerCase().startsWith("/login") ||
    pathname?.startsWith("/driver-access") ||
    pathname?.includes("/driver-access")
  );`;

const excludedReplacement = `  // Avoid clashing with existing bottom-8 right-8 support chat icon on portal pages
  const hasExistingBottomChat = Boolean(
    pathname?.includes("/Agent/") ||
    pathname?.includes("/Policy_Holder/") ||
    pathname?.includes("/Office_Staff/") ||
    pathname?.includes("/Admin/") ||
    pathname?.includes("/driver-access")
  );

  // User instructions: exclude claim apply process and login pages
  const isExcluded = Boolean(
    pathname?.includes("/Policy_Holder/New_Claim") ||
    pathname === "/Login" ||
    pathname?.toLowerCase().startsWith("/login")
  );`;

const excludedTargetCRLF = excludedTarget.replace(/\r?\n/g, '\r\n');
const excludedTargetLF = excludedTarget.replace(/\r?\n/g, '\n');

if (content.includes(excludedTargetCRLF)) {
  content = content.replace(excludedTargetCRLF, excludedReplacement.replace(/\r?\n/g, '\r\n'));
  console.log('Updated excludedTarget (CRLF)');
} else if (content.includes(excludedTargetLF)) {
  content = content.replace(excludedTargetLF, excludedReplacement.replace(/\r?\n/g, '\n'));
  console.log('Updated excludedTarget (LF)');
} else {
  console.error('Could not find excludedTarget');
}

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully updated AIChatBot.tsx');
