import "./globals.css";
import { ThemeProvider } from "../lib/theme";
import { AuthProvider } from "../lib/auth";
import ConvexClientProvider from "./ConvexClientProvider";

export const metadata = {
  title: "Setu — Academia-Industry Collaboration Portal",
  description:
    "Skill mapping, internships, and placements — a unified platform connecting students, academicians, and industry across every sector.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground font-sans">
        <ConvexClientProvider>
          <ThemeProvider>
            <AuthProvider>{children}</AuthProvider>
          </ThemeProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}

