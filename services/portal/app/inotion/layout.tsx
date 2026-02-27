import type { Metadata } from "next";
import { ThemeProvider } from "../components/inotion/ThemeProvider";

export const metadata: Metadata = {
  title: "00Raiser — Operations Portal",
  description: "One founder. 17 autonomous agents. 24/7 operations.",
};

export default function INotionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
