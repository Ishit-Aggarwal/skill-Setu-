export const metadata = {
  title: "AyuSetu — AYUSH Academia-Industry Portal",
  description:
    "Skill assessment, mapping and placement platform connecting AYUSH students, academicians, industry and institutions. Built for SIH26044.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
