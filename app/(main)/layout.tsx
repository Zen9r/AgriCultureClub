// app/(main)/layout.tsx -- النسخة الصحيحة

import { AuthProvider } from "@/context/AuthContext";
import Footer from "@/components/footer";
import Navbar from "@/components/navbar";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow">{children}</main>
        <Footer />
      </div>
    </AuthProvider>
  );
}