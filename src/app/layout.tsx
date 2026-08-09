import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "McKinney SDA Church",
  description: "Seventh-day Adventist congregation in McKinney, Texas.",
};

// Set theme before paint to avoid a flash of the wrong mode.
const noFlash =
  "(function(){try{var m=document.cookie.match(/(?:^|; )theme=(dark|light)/);if(m&&m[1]==='dark')document.documentElement.classList.add('dark');}catch(e){}})();";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: noFlash }} /></head>
      <body>{children}</body>
    </html>
  );
}
