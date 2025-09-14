import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"

export const metadata: Metadata = {
  title: "TRMP Wallet - Secure Non-Custodial Wallet",
  description:
    "TRMP Wallet is a secure, non-custodial cryptocurrency wallet with client-side transaction signing, AES-encrypted storage, and full user privacy.",
  keywords: [
    "TRMP Wallet",
    "TRMP",
    "cryptocurrency wallet",
    "non-custodial",
    "bitcoin-like wallet",
    "secure crypto wallet",
    "AES encryption",
    "client-side signing",
  ],
  authors: [{ name: "TRMP Community" }],
  creator: "TRMP Community",
  publisher: "TRMP Community",
  applicationName: "TRMP Wallet",
  openGraph: {
    title: "TRMP Wallet - Secure Non-Custodial Wallet",
    description:
      "A modern and secure TRMP wallet that keeps your keys safe. Local signing, no private key ever leaves your device.",
    url: "https://trmpwallet.hysanalde.com/",
    siteName: "TRMP Wallet",
    images: [
      {
        url: "https://trmpwallet.hysanalde.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "TRMP Wallet",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TRMP Wallet - Secure Non-Custodial Wallet",
    description:
      "TRMP Wallet protects your keys with AES encryption and local signing. Your crypto, your control.",
    images: ["https://trmpwallet.hysanalde.com/og-image.png"],
    creator: "@trmp_wallet",
  },
  category: "finance",
  generator: "Next.js",
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <head>
           <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#7B2EFF" /> 
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}

/* 桌面端宽度限制 */
@media (min-width: 768px) {
  body {
    max-width: 428px;
    margin: 0 auto;
    box-shadow: 0 0 20px rgba(0, 0, 0, 0.3);
  }
}
        `}</style>
      </head>
      <body className="antialiased bg-gray-900">
        {children}
        <Toaster />
      </body>
    </html>
  )
}
