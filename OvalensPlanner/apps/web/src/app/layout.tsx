import type { Metadata } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/auth-context";
import { LoginGate } from "@/components/login-gate";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ovalens — Tax Intelligence for Financial Advisers",
  description:
    "Real-time tax planning and analysis for UK financial advisers. Powered by AI.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">
        <ThemeProvider>
          <AuthProvider>
            <LoginGate>{children}</LoginGate>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
