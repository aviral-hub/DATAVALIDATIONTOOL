import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Data Validation & Analysis Tool | Professional Data Quality Assessment",
  description:
    "Comprehensive web-based data validation and analysis tool for CSV and Excel files. Features automated quality scoring, contextual validation, statistical analysis, and detailed reporting. Built for data professionals and researchers.",
  keywords: [
    "data validation",
    "data quality",
    "data analysis",
    "CSV analysis",
    "Excel analysis",
    "data cleaning",
    "statistical analysis",
    "data profiling",
    "data assessment",
    "quality metrics",
    "data governance",
    "data integrity",
  ],
  authors: [{ name: "Aviral Pathak" }, { name: "Harsh Selukar" }, { name: "Kedar Thakare" }, { name: "Parth Yadav" }],
  creator: "Data Validation Team",
  publisher: "College Project",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://data-validation-tool.vercel.app",
    title: "Data Validation & Analysis Tool",
    description:
      "Professional data quality assessment tool with automated validation, statistical analysis, and comprehensive reporting capabilities.",
    siteName: "Data Validation Tool",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Data Validation & Analysis Tool",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Data Validation & Analysis Tool",
    description: "Professional data quality assessment with automated validation and statistical analysis.",
    images: ["/og-image.png"],
  },
  verification: {
    google: "your-google-verification-code",
  },
  category: "Data Analysis",
  classification: "Business Tool",
  referrer: "origin-when-cross-origin",
    generator: 'v0.dev'
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#3b82f6",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="canonical" href="https://data-validation-tool.vercel.app" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="application-name" content="Data Validation Tool" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Data Validation Tool" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#3b82f6" />
        <meta name="msapplication-tap-highlight" content="no" />

        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "Data Validation & Analysis Tool",
              description:
                "Comprehensive web-based data validation and analysis tool for CSV and Excel files with automated quality scoring and statistical analysis.",
              url: "https://data-validation-tool.vercel.app",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web Browser",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
              creator: [
                {
                  "@type": "Person",
                  name: "Aviral Pathak",
                },
                {
                  "@type": "Person",
                  name: "Harsh Selukar",
                },
                {
                  "@type": "Person",
                  name: "Kedar Thakare",
                },
                {
                  "@type": "Person",
                  name: "Parth Yadav",
                },
              ],
              contributor: {
                "@type": "Person",
                name: "Prof. Sampada Wazalwar",
                jobTitle: "Professor",
              },
            }),
          }}
        />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}
