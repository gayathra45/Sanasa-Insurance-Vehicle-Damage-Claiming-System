const fs = require('fs');
const path = 'frontend/app/driver-access/[token]/page.tsx';

let content = fs.readFileSync(path, 'utf8');

// 1. Remove Desktop Chat Button in Navbar
const desktopChatTarget = `            {/* Direct Chat with Policyholder, Branch & Agent */}
            <button
              onClick={() => {
                setChatTargetClaim(claims[0]?.claimNumber || profile?.reference || "");
                setChatModalOpen(true);
              }}
              className="relative p-2 rounded-xl transition-all border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 cursor-pointer flex items-center gap-1.5"
              title="Chat with Policyholder, Branch & Agent"
            >
              <HugeiconsIcon icon={BubbleChatIcon} className="w-4 h-4 text-[#0284c7]" />
              <span className="hidden lg:inline text-xs font-bold text-slate-700">Chat</span>
            </button>

`;

const desktopChatTargetCRLF = desktopChatTarget.replace(/\r?\n/g, '\r\n');
const desktopChatTargetLF = desktopChatTarget.replace(/\r?\n/g, '\n');

if (content.includes(desktopChatTargetCRLF)) {
  content = content.replace(desktopChatTargetCRLF, '');
  console.log('Removed desktop chat button (CRLF)');
} else if (content.includes(desktopChatTargetLF)) {
  content = content.replace(desktopChatTargetLF, '');
  console.log('Removed desktop chat button (LF)');
} else {
  console.error('Could not find desktop chat target');
}

// 2. Remove Mobile Chat Button in Navbar
const mobileChatTarget = `          <button
            onClick={() => {
              setChatTargetClaim(claims[0]?.claimNumber || profile?.reference || "");
              setChatModalOpen(true);
            }}
            className="px-3 py-1 rounded-full text-xs font-semibold bg-sky-50 text-[#0284c7] border border-sky-200 whitespace-nowrap flex items-center gap-1"
          >
            <HugeiconsIcon icon={BubbleChatIcon} className="w-3.5 h-3.5" />
            <span>Chat</span>
          </button>
`;

const mobileChatTargetCRLF = mobileChatTarget.replace(/\r?\n/g, '\r\n');
const mobileChatTargetLF = mobileChatTarget.replace(/\r?\n/g, '\n');

if (content.includes(mobileChatTargetCRLF)) {
  content = content.replace(mobileChatTargetCRLF, '');
  console.log('Removed mobile chat button (CRLF)');
} else if (content.includes(mobileChatTargetLF)) {
  content = content.replace(mobileChatTargetLF, '');
  console.log('Removed mobile chat button (LF)');
} else {
  console.error('Could not find mobile chat target');
}

// 3. Add listener for "open-driver-chat" and dispatch "driver-chat-modal-state"
const eventHookTarget = '  const [chatModalOpen, setChatModalOpen] = useState(false);';
const eventHookReplacement = `  const [chatModalOpen, setChatModalOpen] = useState(false);

  // Synchronize driver claim chat with bottom-right floating chat buttons
  useEffect(() => {
    const handleOpenDriverChat = () => {
      setChatTargetClaim(claims[0]?.claimNumber || profile?.reference || "");
      setChatModalOpen(true);
    };
    window.addEventListener("open-driver-chat", handleOpenDriverChat);
    return () => window.removeEventListener("open-driver-chat", handleOpenDriverChat);
  }, [claims, profile]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("driver-chat-modal-state", { detail: { isOpen: chatModalOpen } }));
  }, [chatModalOpen]);`;

if (content.includes(eventHookTarget)) {
  content = content.replace(eventHookTarget, eventHookReplacement);
  console.log('Added event hooks');
} else {
  console.error('Could not find eventHookTarget');
}

// 4. Save driver profile in sessionStorage so AIChatBot can greet them
const saveProfileTarget = 'setProfile(meData.profile);';
const saveProfileReplacement = `setProfile(meData.profile);
        if (typeof window !== "undefined") {
          try {
            sessionStorage.setItem("sanasa_tp_driver_profile", JSON.stringify(meData.profile));
          } catch (_) {}
        }`;

if (content.includes(saveProfileTarget)) {
  content = content.replace(saveProfileTarget, saveProfileReplacement);
  console.log('Added profile session storage save');
} else {
  console.error('Could not find saveProfileTarget');
}

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully updated page.tsx');
