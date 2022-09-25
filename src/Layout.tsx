import React from "react";
import Header from "./Header";
import { User } from "./types";

interface LayoutProps {
  user?: User;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children, user }) => {
  return (
    <div className="h-screen flex flex-col bg-base-300">
      <Header user={user}/>
      <main className="w-full border-b p-4">
        <h1 className="text-center">
          Chat with others... <span className="font-semibold">privately!</span>
        </h1>
      </main>

      {children}
    </div>
  );
};

export default Layout;
