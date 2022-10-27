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
      <Header user={user} />
      {children}
    </div>
  );
};

export default Layout;
