import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Next.js SQLite Boilerplate",
  description: "A modern boilerplate with Next.js, SQLite, and Authentication",
};

import { CartProvider } from "@/context/CartContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <CartProvider>
          {children}
        </CartProvider>
      </body>
    </html>
  );
}
