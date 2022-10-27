import React from "react";
import toast from "react-hot-toast";
import { MdSend } from "react-icons/md";
import { User } from "./types";
import copy from "copy-to-clipboard";

interface Props {
  user?: User;
}

const Header: React.FC<Props> = ({ user }) => {
  const copyInviteLink = () => {
    copy(`${window.location.origin}/invite/${user?.id}/${user?.username}`);
    toast("Invite link copied to clipboard");
  };

  return (
    <header className="navbar h-16 border-b border-base-100 border-4 sm:px-4 bg-base-200">
      <div className="navbar-start">
        <span className="text-xl text-primary font-extrabold font-mono">
          Loquor
        </span>
      </div>
      <div className="navbar-end gap-4">
        {user && (
          <div
            className="xs:tooltip xs:tooltip-left"
            data-tip="Copy invite link"
          >
            <button
              className="h-10 w-10 flex items-center justify-center hover:text-primary"
              onClick={() => copyInviteLink()}
            >
              <MdSend size={24} />
            </button>
          </div>
        )}
        <img
          className="rounded w-10 h-10"
          src={`https://ui-avatars.com/api/?name=${user?.username ?? "?"}`}
          alt="Me"
        />
      </div>
    </header>
  );
};

export default Header;
