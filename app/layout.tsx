import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vault Ops CRM",
  description: "Vault Ops CRM frontend MVP"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
