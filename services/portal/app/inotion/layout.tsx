import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "INotion — Knowledge Base",
  description: "Outline knowledge base dashboard",
};

export default function INotionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
