import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { PwaRegister } from "@/components/pwa-register";
import { InstallPrompt } from "@/components/install-prompt";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const TITLE = "Upfront Portal";
const DESCRIPTION = "Gestão completa para escolas de inglês online.";

// Resolved per-request (not a static metadataBase) since this app is
// deliberately served from two different domains at once (Vercel's own
// URL and the Hostinger-hosted portal.upfrontidiomas.com.br) — a hardcoded
// base would make link previews show the wrong domain on whichever one
// it didn't match. A WhatsApp/social link preview needs og:image as a
// real absolute URL, not a relative path.
export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get("host") ?? "upfrontidiomas.com.br";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;
  const ogImage = { url: `${baseUrl}/og-image.png`, width: 1200, height: 630, alt: TITLE };

  return {
    title: TITLE,
    description: DESCRIPTION,
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: "Upfront",
    },
    icons: {
      apple: "/apple-touch-icon.png",
    },
    openGraph: {
      title: TITLE,
      description: DESCRIPTION,
      url: baseUrl,
      siteName: TITLE,
      images: [ogImage],
      locale: "pt_BR",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: TITLE,
      description: DESCRIPTION,
      images: [ogImage.url],
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#000124",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster position="top-right" richColors />
          <PwaRegister />
          <InstallPrompt />
        </ThemeProvider>
      </body>
    </html>
  );
}
