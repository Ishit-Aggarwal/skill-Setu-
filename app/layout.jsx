import "./globals.css";
import { AuthProvider } from "../lib/auth";
import ConvexClientProvider from "./ConvexClientProvider";

export const metadata = {
  title: "Skill Setu — Academia-Industry Collaboration Portal",
  description:
    "Skill mapping, internships and placements across every sector — connecting students, academicians, institutions and employers, with dedicated depth for the AYUSH ecosystem. Built for problem statement SIH26044.",
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

