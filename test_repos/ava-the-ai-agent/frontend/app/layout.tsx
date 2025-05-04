"use client";
/* eslint-disable @typescript-eslint/no-unused-vars */
import "./globals.css";
import { Inter } from "next/font/google";
import { MainLayout } from "@/components/layouts/MainLayout";
import { ThirdwebProvider } from "thirdweb/react";
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from "@/components/ui/toaster";
import { TurnkeyProvider } from "@/app/contexts/TurnkeyContext";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
});


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  const queryClient = new QueryClient();

  return (
    <html lang="en" className={`${inter.variable} font-sans`}>
      <body
        className={`${inter.className} bg-dark-navy min-h-screen antialiased`}
      >
        <QueryClientProvider client={queryClient}>
          <ThirdwebProvider>
            <TurnkeyProvider>
              <MainLayout>{children}</MainLayout>
              <Toaster />
            </TurnkeyProvider>
          </ThirdwebProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
