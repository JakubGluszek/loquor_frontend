import React from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import {
  AiOutlineSortAscending,
  AiOutlineSortDescending,
} from "react-icons/ai";
import { MdClose, MdSearch } from "react-icons/md";
import { Sort, User } from "./types";

interface UsersViewProps {
  users: User[];
  invitedUsers: User[];
  sendInvite: (user: User) => void;
  cancelInvite: (user: User) => void;
}

const UsersView: React.FC<UsersViewProps> = ({
  users,
  invitedUsers,
  sendInvite,
  cancelInvite,
}) => {
  const [parent] = useAutoAnimate<HTMLDivElement>();
  const [sort, setSort] = React.useState<Sort>("asc");
  const [query, setQuery] = React.useState("");

  let sortedUsers =
    sort === "asc"
      ? users.sort((a, b) => (a.username > b.username ? 1 : -1))
      : users.sort((a, b) => (a.username < b.username ? 1 : -1));

  if (query.length > 0) {
    sortedUsers = sortedUsers.filter((u) =>
      u.username.toLowerCase().includes(query.toLowerCase())
    );
  }

  return (
    <div className="flex-grow flex flex-col overflow-x-hidden">
      <div className="min-h-fit flex flex-row flex-wrap gap-2 xs:flex-nowrap items-center xs:gap-4 p-2 sm:p-4 animate-in slide-in-from-top-16 duration-300">
        {/* filter by username */}
        <label className="input-group flex-grow">
          <span className="border-2 bg-base-200 border-base-100">
            <MdSearch size={24} className="w-4 h-4 sm:w-6 sm:h-6" />
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            type="text"
            className="w-full input input-bordered input-sm sm:input-md"
          />
        </label>
        {/* close search view */}
        {query.length > 0 && (
          <button
            className="btn btn-ghost btn-sm sm:btn-md hover:btn-primary"
            onClick={() => setQuery("")}
          >
            <MdClose size={24} />
          </button>
        )}
        {/* sort by username */}
        {sort === "asc" ? (
          <button
            className="bg-base-200 p-1 sm:p-2 rounded border"
            onClick={() => setSort("desc")}
          >
            <AiOutlineSortAscending size={24} className="sm:w-8 sm:h-8" />
          </button>
        ) : (
          <button
            className="bg-base-200 p-1 sm:p-2 rounded border"
            onClick={() => setSort("asc")}
          >
            <AiOutlineSortDescending size={24} className="sm:w-8 sm:h-8" />
          </button>
        )}
      </div>
      {/* users */}
      <div className="flex-grow w-full p-2 sm:p-4 overflow-y-auto min-h-0 overflow-x-hidden">
        <div ref={parent} className="flex flex-col gap-4">
          {sortedUsers.length > 0 ? (
            sortedUsers.map((user) => (
              <div
                key={user.id}
                className="flex flex-row flex-wrap items-center border-2 border-base-100 hover:bg-base-200 gap-4 p-2 sm:p-4 rounded"
              >
                <img
                  className="rounded w-8 h-8 sm:w-12 sm:h-12"
                  src={`https://ui-avatars.com/api/?name=${user.username}`}
                  alt={user.username}
                />
                <span className="flex-grow text-lg sm:text-2xl text-highlight">
                  {user.username}
                </span>
                {invitedUsers.includes(user) ? (
                  <button
                    className="flex-grow xs:flex-grow-0 ml-auto btn btn-secondary btn-sm sm:btn-md"
                    onClick={() => cancelInvite(user)}
                  >
                    Cancel invite
                  </button>
                ) : (
                  <button
                    className="flex-grow xs:flex-grow-0 ml-auto btn btn-primary btn-sm sm:btn-md"
                    onClick={() => sendInvite(user)}
                  >
                    Invite to chat
                  </button>
                )}
              </div>
            ))
          ) : (
            <div className="flex-grow flex items-center justify-center text-xl">
              <span className="text-primary">0</span>&nbsp;users online.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UsersView;
