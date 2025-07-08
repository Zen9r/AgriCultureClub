//app/layout.tsx

import { Tajawal } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers"; 

const tajawal = Tajawal({
  subsets: ["arabic"],
  weight: ["200", "300", "400", "500", "700", "800", "900"],
  variable: "--font-tajawal",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className={tajawal.variable}>
      <body className="font-tajawal antialiased">
        <Providers>
        {children}
        </Providers>
      </body>
    </html>
  );
}