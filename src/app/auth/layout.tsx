import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Authentication - Echelon",
  description: "Sign in or create an account",
};

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
