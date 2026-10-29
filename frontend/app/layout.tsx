import type { Metadata } from "next";
import { Afacad } from "next/font/google";
import "./globals.css";
import WebAIChatBot from "./Components/AIChatBot";
import { ChatNotificationProvider } from "./context/ChatNotificationContext";
import ClaimChatModal from "./Components/ClaimChat/ClaimChatModal";
import FloatingClaimChatButton from "./Components/ClaimChat/FloatingClaimChatButton";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const afacad = Afacad({
  variable: "--font-afacad",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://sanasa-insurance-vehicle-damage-cla.vercel.app"),
  title: {
    default: "SANASA General Insurance — SClaim Go",
    template: "%s | SANASA General Insurance",
  },
  description:
    "Protect Your Drive with Confidence. Fast motor claims, scene-of-accident reporting, digital driver passes, and flexible policy renewals with SANASA General Insurance PLC.",
  keywords: [
    "SANASA Insurance",
    "Motor Insurance Sri Lanka",
    "Vehicle Damage Claim",
    "SClaim Go",
    "Insurance Claim App",
    "Roadside Assistance Sri Lanka",
  ],
  authors: [{ name: "SANASA General Insurance PLC" }],
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "SANASA General Insurance — SClaim Go",
    description:
      "Enterprise Motor Claim, Policy Renewal & Driver Fleet Governance Platform. Fast claims, instant roadside assistance, and 24/7 hotline 0725 575 575.",
    url: "https://sanasa-insurance-vehicle-damage-cla.vercel.app",
    siteName: "SANASA General Insurance PLC",
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "SANASA General Insurance SClaim Go",
      },
    ],
    locale: "en_LK",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "SANASA General Insurance — SClaim Go",
    description:
      "Enterprise Motor Claim, Policy Renewal & Driver Fleet Governance Platform.",
    images: ["/logo.png"],
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
          <Analytics />
          <SpeedInsights />
        </ChatNotificationProvider>
      </body>
    </html>
  );
}
