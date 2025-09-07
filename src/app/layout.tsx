import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import CssReadyGate from "@/components/CssReadyGate";

export const metadata: Metadata = {
  title: "German App",
  description: "Sentence mining and Anki export",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`bg-gray-900 w-screen h-screen`}>
        <div className="flex flex-row h-dvh">
          <CssReadyGate>
            <div className="bg-black py-4">
              <NavItem link="/">
                Import Files
              </NavItem>
              <NavItem link="/mine">
                Mine Sentences
              </NavItem>
              <NavItem link="/export">
                Export to Anki
              </NavItem>
            </div>
            <div className="w-full m-2">
              {children}
            </div>
          </CssReadyGate>
        </div>
      </body>
    </html>
  );
}

function NavItem({ children, link }: { children?: React.ReactNode, link: string }) {
  return (
    <Link
      href={link}
      className="h-10 flex flex-col p-2 cursor-pointer
              bg-gray-700 rounded-md m-2 text-nowrap"
    >
      {children}
    </Link>
  );
}
