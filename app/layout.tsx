import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Adashi",
  description: "Adashi — digital community savings for West Africa",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        {/* Apply saved theme before paint to avoid a flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('adashi-theme');if(t==='light'){document.documentElement.setAttribute('data-theme','light');document.documentElement.classList.add('light-theme');}}catch(e){}})();`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
