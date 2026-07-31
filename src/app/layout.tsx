import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

/*
 * The reference's typeface. Loaded as a variable font so weight is continuous —
 * hierarchy in this design comes from weight as much as size.
 *
 * This overrides the system-font default deliberately: the client picked a face,
 * which is the only good reason to give up the platform's own optical sizing and
 * tracking tables.
 */
const display = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Arrow Builders",
  description: "Project, schedule and cost control for construction developers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={display.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
