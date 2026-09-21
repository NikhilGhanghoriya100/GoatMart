"use client";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "@/context/ThemeContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              fontFamily: "var(--font-sans), sans-serif",
              fontSize: "13px",
              borderRadius: "12px",
              background: "#18181b",
              color: "#f4f4f5",
              border: "1px solid #27272a",
              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
            },
            success: {
              iconTheme: {
                primary: "#c8a96e",
                secondary: "#18181b",
              },
            },
          }}
        />
      </ThemeProvider>
    </SessionProvider>
  );
}
