import type { Metadata } from "next";
import { Afacad } from "next/font/google";
import "./globals.css";
import WebAIChatBot from "./Components/AIChatBot";
import { ChatNotificationProvider } from "./context/ChatNotificationContext";
import ClaimChatModal from "./Components/ClaimChat/ClaimChatModal";
import FloatingClaimChatButton from "./Components/ClaimChat/FloatingClaimChatButton";

const afacad = Afacad({
  variable: "--font-afacad",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sanasa General Insurance",
  description: "Protect Your Drive with Confidence. Fast Claims. Affordable Plans. Trusted Protection.",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${afacad.variable} antialiased`}
        suppressHydrationWarning
      >
        <ChatNotificationProvider>
          {children}
          <ClaimChatModal />
          <FloatingClaimChatButton />
          <WebAIChatBot />
        </ChatNotificationProvider>
      </body>
    </html>
  );
}
