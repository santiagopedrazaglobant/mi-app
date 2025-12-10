import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Usar Inter en lugar de Geist (Inter es una fuente segura y similar)
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sistema de Préstamos",
  description: "Gestión simplificada de créditos y préstamos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}