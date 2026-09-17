import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Resume Lens — Clear feedback. Stronger applications.",
  description: "Compare your resume with a job description and turn evidence-based feedback into a clearer application.",
  robots: { index: false, follow: false }
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
