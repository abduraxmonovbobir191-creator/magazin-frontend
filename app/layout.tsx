import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Magazin | Boshqaruv tizimi",
  description: "Oziq-ovqat magazini savdo, ombor va moliya boshqaruvi",
  applicationName: "Magazin",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="uz"><body>{children}</body></html>;
}
