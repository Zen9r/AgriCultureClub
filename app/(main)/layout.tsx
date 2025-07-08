// app/(main)/layout.tsx -- النسخة الصحيحة

import { AuthProvider } from "@/context/AuthContext";
import Footer from "@/components/footer";
import Navbar from "@/components/navbar";
import { Toaster } from "react-hot-toast";

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
        <Toaster position="bottom-center" />
      </div>
    </AuthProvider>
  );
}