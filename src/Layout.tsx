import React from "react";

interface LayoutProps {
  username?: string;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children, username }) => {
  return (
    <div className="h-screen flex flex-col bg-base-300">
      <header className="navbar h-16 border-b">
        <div className="navbar-start"></div>
        <div className="navbar-center">
          <span className="text-xl">Loquor</span>
        </div>
        <div className="navbar-end">
          <img
            className="rounded w-10 h-10"
            src={`https://ui-avatars.com/api/?name=${username ?? "?"}`}
            alt="Me"
          />
        </div>
      </header>

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
