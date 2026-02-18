import "./globals.css";

export const metadata = {
  title: "GuessrAgent - AI Geolocation",
  description: "Paste images and let AI guess the location",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
