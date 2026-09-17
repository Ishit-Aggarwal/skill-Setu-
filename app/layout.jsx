import "./globals.css";
import { AuthProvider } from "../lib/auth";
import ConvexClientProvider from "./ConvexClientProvider";

export const metadata = {
  title: "Skill Setu — AYUSH Academia–Industry Collaboration Portal",
  description:
    "Ministry of AYUSH academia–industry portal for skill mapping, internships and placement across Ayurveda, Yoga & Naturopathy, Unani, Siddha and Homoeopathy — connecting BAMS/BHMS/BUMS/BSMS/BNYS students, AYUSH colleges, faculty and ASU&H industry partners. Built for SIH26044.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground font-sans">
        <ConvexClientProvider>
          <AuthProvider>{children}</AuthProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}

