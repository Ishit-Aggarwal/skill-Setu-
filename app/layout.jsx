export const metadata = {
  title: "AyushBridge — National AYUSH Academia-Industry Portal",
  description:
    "Skill assessment, industry collaboration, and placement platform connecting AYUSH students, academicians, and wellness enterprises across Ayurveda, Yoga, Unani, Siddha, and Homoeopathy.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
