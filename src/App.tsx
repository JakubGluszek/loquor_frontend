import React from "react";
import toast from "react-hot-toast";
import { MdClose, MdOutlineExitToApp, MdSearch } from "react-icons/md";
import {
  AiOutlineSortAscending,
  AiOutlineSortDescending,
} from "react-icons/ai";
import { SiGooglechat } from "react-icons/si";
import { HiUserAdd } from "react-icons/hi";
import cuid from "cuid";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { formatDistance } from "date-fns";
import { Loader } from "@mantine/core";

const WEBSOCKET_URL = import.meta.env.VITE_WS_SERVER;

interface User {
  id: string;
  username: string;
}

interface ChatInvite {
  user: User;
}

interface Message {
  author: User;
  target: User;
  body: string;
  read?: boolean;
  timestamp: Date;
}

interface Peer {
  pc: RTCPeerConnection;
  user: User;
  host: boolean;
  dc?: RTCDataChannel;
}

type Sort = "asc" | "desc" | null;

interface EventUser {
  type: "me" | "setUser" | "addUser" | "removeUser";
  data: User;
}

interface EventSetUsers {
  type: "setUsers";
  data: User[];
}

interface EventChatInvite {
  type: "chatInvite" | "chatInviteCancel";
  data: ChatInvite;
}

interface EventChatRes {
  type: "chatInviteRes";
  data: {
    from: User;
    target: string; // User.id
    response: boolean;
  };
}

interface EventIceCandidate {
  type: "ice-candidate";
  data: {
    from: string; // me.id
    target: string; // openChat.id
    candidate: RTCIceCandidateInit;
  };
}

interface EventSDPDescription {
  type: "offer" | "answer";
  data: {
    from: string; // me.id
    target: string; // openChat.id
    description: RTCSessionDescriptionInit;
  };
}

type EventData =
  | EventUser
  | EventSetUsers
  | EventChatInvite
  | EventChatRes
  | EventIceCandidate
  | EventSDPDescription;

interface LoginViewProps {
  setUsername: (username: string) => void;
}

const LoginView: React.FC<LoginViewProps> = ({ setUsername }) => {
  const usernameRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className="min-h-screen w-full flex flex-col gap-4 xs:gap-8 items-center justify-center bg-base-300 text-xs xs:text-base">
      <h1 className="text-lg xs:text-2xl">
        Welcome to <span className="font-bold">Loquor</span>
      </h1>
      <p className="text-center">
        A platform where you can chat with others{" "}
        <span className="font-extrabold">directly</span>.
      </p>
      <div className="flex flex-col gap-2 xs:gap-4 p-2 py-4 xs:p-8 border bg-base-100 rounded">
        <input
          placeholder="Username"
          ref={usernameRef}
          maxLength={32}
          minLength={1}
          onKeyUp={(e) =>
            e.key === "Enter" && setUsername(usernameRef.current!.value)
          }
          className="input input-primary input-bordered input-sm xs:input-md"
          type="text"
        />
        <button
          className="btn btn-primary btn-sm xs:btn-md"
          onClick={() => setUsername(usernameRef.current!.value)}
        >
          Enter
        </button>
      </div>
    </div>
  );
};

interface useSocketServerProps {
  username: string | null;
  setMe: (me: User) => void;
}

const useSocketServer = ({ username, setMe }: useSocketServerProps) => {
  const [socket, setSocket] = React.useState<WebSocket | null>(null);

  React.useEffect(() => {
    if (socket || !username) return;

    const socketServer = new WebSocket(WEBSOCKET_URL + username);
    setSocket(socketServer);

    socketServer.addEventListener("message", (e) => {
      const { type, data }: EventData = JSON.parse(e.data);

      if (type === "me") setMe(data);
    });

    return () => socketServer.close();
  }, [username]);

  return socket;
};

interface ChatViewProps {
  me: User;
  user: User;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setOpenChat: (user: User | null) => void;
  dc: RTCDataChannel;
  removePeer: (userID: string) => void;
}

const ChatView: React.FC<ChatViewProps> = ({
  me,
  user,
  messages,
  dc,
  removePeer,
  setOpenChat,
  setMessages,
}) => {
  const [body, setBody] = React.useState("");
  const [isTyping, setIsTyping] = React.useState(false);
  const container = React.useRef<HTMLDivElement>(null);

  const send = () => {
    const message = {
      author: me,
      target: user,
      body,
      timestamp: new Date(),
    };
    dc.send(JSON.stringify({ type: "message", data: message }));
    setMessages((messages) => [...messages, message]);
    setBody("");
  };

  React.useEffect(() => {
    dc.addEventListener("message", (e) => {
      const { type, data } = JSON.parse(e.data);
      if (type === "isTyping") {
        // data: {author: User, isTyping: boolean}
        setIsTyping(data.isTyping);
      } else if (type === "message") {
        setIsTyping(false);
      }
    });
  }, []);

  React.useEffect(() => {
    container.current?.scrollTo({ top: container.current.scrollHeight });
  }, [messages]);

  return (
    <div className="flex-grow flex flex-col overflow-y-hidden min-h-0 overflow-x-hidden text-xs xs:text-base">
      {/* current chat header */}
      <div className="min-h-16 flex flex-row items-center flex-wrap gap-4 p-2 px-4 bg-base-100 border-b">
        <img
          className="rounded w-8 h-8 sm:w-10 sm:h-10"
          src={`https://ui-avatars.com/api/?name=${user.username}`}
          alt={user.username}
        />
        <span className="text-lg sm:text-2xl font-bold">{user.username}</span>
        <div className="ml-auto flex flex-row items-center gap-2">
          <button
            className="btn btn-ghost hover:btn-primary btn-sm sm:btn-md"
            onClick={() => {
              setMessages((messages) =>
                messages.map((m) =>
                  m.author.id !== user.id ? m : { ...m, read: true }
                )
              );
              setOpenChat(null);
            }}
          >
            <MdClose size={24} />
          </button>
          <button
            className="btn btn-ghost hover:btn-primary btn-sm sm:btn-md"
            onClick={() => removePeer(user.id)}
          >
            <MdOutlineExitToApp size={24} />
          </button>
        </div>
      </div>
      <div
        ref={container}
        className="mb-16 sm:mb-0 flex-grow flex flex-col overflow-y-auto min-h-0 overflow-x-hidden"
      >
        {messages
          .filter((m) => m.author.id === user.id || m.target.id === user.id)
          .map((m) => (
            <div
              key={cuid()}
              className="flex flex-row gap-2 p-2 sm:p-4 border-b"
            >
              <img
                className="rounded w-6 h-6 sm:w-8 sm:h-8"
                src={`https://ui-avatars.com/api/?name=${m.author.username}`}
                alt={m.author.username}
              />
              <div className="flex flex-col gap-2">
                <div className="flex flex-row items-center gap-2">
                  <span className="text-lg font-bold">{m.author.username}</span>
                  <span className="text-sm opacity-60">
                    {formatDistance(new Date(), new Date(m.timestamp), {
                      includeSeconds: true,
                    })}
                  </span>
                </div>
                <p className="">{m.body}</p>
              </div>
            </div>
          ))}
      </div>
      <div className="fixed bottom-0 w-full sm:static h-fit flex flex-row flex-wrap xs:flex-nowrap items-center gap-2 px-4 sm:gap-4 p-2 sm:p-4 bg-base-100 border-t">
        <input
          value={body}
          type="text"
          className="flex-grow input input-bordered input-sm sm:input-md bg-base-300"
          placeholder={
            isTyping
              ? `${user.username} is typing...`
              : "Enter your message here"
          }
          onKeyUp={(e) => e.key === "Enter" && send()}
          onChange={(e) => {
            if (e.currentTarget.value.length === 1) {
              dc.send(
                JSON.stringify({
                  type: "isTyping",
                  data: {
                    isTyping: true,
                    author: me,
                  },
                })
              );
            } else if (body.length > 0 && e.currentTarget.value.length === 0) {
              dc.send(
                JSON.stringify({
                  type: "isTyping",
                  data: {
                    isTyping: false,
                    author: me,
                  },
                })
              );
            }
            setBody(e.currentTarget.value);
          }}
        />
        <button
          className="btn btn-primary btn-sm flex-grow xs:flex-grow-0 sm:btn-md sm:w-28"
          onClick={() => send()}
        >
          Send
        </button>
      </div>
    </div>
  );
};

interface PeerViewProps {
  openChat: User | null;
  setOpenChat: (user: User) => void;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  peer: Peer;
}

const PeerView: React.FC<PeerViewProps> = ({
  openChat,
  messages,
  setMessages,
  setOpenChat,
  peer,
}) => {
  const [isTyping, setIsTyping] = React.useState(false);

  React.useEffect(() => {
    peer.dc?.addEventListener("message", (e) => {
      const { type, data } = JSON.parse(e.data);
      if (type === "isTyping") {
        // data: {author: User, isTyping: boolean}
        setIsTyping(data.isTyping);
      } else if (type === "message") {
        setIsTyping(false);
      }
    });
  }, []);

  return (
    <div
      className="z-50 min-w-fit min-h-fit relative cursor-pointer bg-base-100 border p-2 rounded shadow-lg"
      onClick={() => {
        if (openChat) {
          setMessages((messages: Message[]) =>
            messages.map((m) =>
              m.author.id !== openChat.id ? m : { ...m, read: true }
            )
          );
        }
        setOpenChat(peer.user);
        setMessages((messages) =>
          messages.map((m) =>
            m.author.id !== peer.user.id ? m : { ...m, read: true }
          )
        );
      }}
    >
      {!isTyping &&
        messages.filter((m) => m.author.id === peer.user.id && !m.read).length >
          0 && (
          <span className="absolute -top-1 -right-1 badge rounded-full p-0.5 px-1">
            {
              messages.filter((m) => m.author.id === peer.user.id && !m.read)
                .length
            }
          </span>
        )}
      {isTyping && (
        <span className="absolute -top-1 -right-1 badge rounded-full p-0.5">
          <Loader color="dark" variant="dots" size="sm" />
        </span>
      )}
      <img
        className="rounded w-8 h-8 sm:w-12 sm:h-12"
        src={`https://ui-avatars.com/api/?name=${peer.user.username}`}
        alt={peer.user.username}
      />
    </div>
  );
};

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

  // https://stackoverflow.com/questions/1129216/sort-array-of-objects-by-string-property-value
  let sortedUsers;
  if (sort === "asc") {
    sortedUsers = users.sort((a, b) =>
      a.username > b.username ? 1 : b.username > a.username ? -1 : 0
    );
  } else {
    sortedUsers = users.sort((a, b) =>
      a.username < b.username ? 1 : b.username < a.username ? -1 : 0
    );
  }

  if (query.length > 0) {
    sortedUsers = sortedUsers.filter((u) =>
      u.username.toLowerCase().includes(query.toLowerCase())
    );
  }

  return (
    <div className="flex-grow flex flex-col overflow-x-hidden">
      <div className="min-h-fit flex flex-row flex-wrap gap-2 xs:flex-nowrap items-center xs:gap-4 p-2 sm:p-4">
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
        {query.length > 0 && (
          <button
            className="btn btn-ghost btn-sm sm:btn-md hover:btn-primary"
            onClick={() => setQuery("")}
          >
            <MdClose size={24} />
          </button>
        )}
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
          {sortedUsers.map((user) => (
            <div
              key={user.id}
              className="flex flex-row flex-wrap items-center border bg-base-100 gap-4 p-2 rounded"
            >
              <img
                className="rounded w-8 h-8 sm:w-12 sm:h-12"
                src={`https://ui-avatars.com/api/?name=${user.username}`}
                alt={user.username}
              />
              <span className="flex-grow text-lg sm:text-2xl font-bold">
                {user.username}
              </span>
              {invitedUsers.includes(user) ? (
                <button
                  className="flex-grow  ml-auto btn btn-secondary btn-sm sm:btn-md"
                  onClick={() => cancelInvite(user)}
                >
                  Cancel invite
                </button>
              ) : (
                <button
                  className="flex-grow ml-auto btn btn-primary btn-sm sm:btn-md"
                  onClick={() => sendInvite(user)}
                >
                  Invite to chat
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

interface HomeViewProps {
  me: User;
  socket: WebSocket;
}

const HomeView: React.FC<HomeViewProps> = ({ me, socket }) => {
  const [users, setUsers] = React.useState<User[]>([]);
  const [peers, setPeers] = React.useState(new Map<string, Peer>());

  const [invitedUsers, setInvitedUsers] = React.useState<User[]>([]);
  const [chatInvites, setChatInvites] = React.useState<User[]>([]);

  const [openChat, setOpenChat] = React.useState<User | null>(null);
  const [messages, setMessages] = React.useState<Message[]>([]);

  const [viewInvite, setViewInvite] = React.useState<User | null>(null);
  const [parent] = useAutoAnimate<HTMLDivElement>();

  React.useEffect(() => {
    socket.addEventListener("message", (e) => {
      const { type, data }: EventData = JSON.parse(e.data);

      switch (type) {
        case "setUsers":
          setUsers(data);
          break;
        case "addUser":
          setUsers((users) => [...users, data]);
          break;
        case "removeUser":
          removePeer(data.id);
          setUsers((users) => users.filter((user) => user.id !== data.id));
          break;
        case "chatInvite":
          setChatInvites((chatInvites) => [...chatInvites, data.user]);
          break;
        case "chatInviteCancel":
          setChatInvites((chatInvites) =>
            chatInvites.filter((c) => c.id !== data.user.id)
          );
          setViewInvite(null);
          break;
        default:
          break;
      }
    });
    socket.send(JSON.stringify({ type: "getUsers", data: {} }));
  }, []);

  React.useEffect(() => {
    socket.addEventListener("message", (e) => {
      const { type, data }: EventData = JSON.parse(e.data);
      let peer: Peer | undefined;

      switch (type) {
        case "chatInviteRes":
          if (data.response === true) {
            let peer = peers.get(data.from.id);
            if (!peer) return;

            toast("Chat offer accepted");

            peer.pc
              .createOffer()
              .then((offer) => peer?.pc.setLocalDescription(offer))
              .then(() => {
                socket.send(
                  JSON.stringify({
                    type: "offer",
                    data: {
                      from: me.id,
                      target: data.from.id,
                      description: peer?.pc.localDescription,
                    },
                  })
                );
              })
              .catch((error) =>
                console.log("error while creating offer ", error)
              );
            setInvitedUsers((users) =>
              users.filter((user) => user.id !== data.from.id)
            );
          } else {
            toast(`${data.from.username} rejected your chat offer :(`);
            removePeer(data.from.id);
            setInvitedUsers((users) =>
              users.filter((user) => user.id !== data.from.id)
            );
          }
          break;
        case "ice-candidate":
          peer = peers.get(data.from);
          if (!peer) return;

          peer.pc.addIceCandidate(data.candidate);
          break;
        case "offer":
          peer = peers.get(data.from);
          if (!peer) return;

          peer.pc
            .setRemoteDescription(new RTCSessionDescription(data.description))
            .catch((error) =>
              console.log("Caught an error while setting: offer", error)
            );
          peer.pc
            .createAnswer()
            .then((answer) => peer?.pc.setLocalDescription(answer))
            .then(() =>
              socket.send(
                JSON.stringify({
                  type: "answer",
                  data: {
                    from: me.id,
                    target: data.from,
                    description: peer?.pc.localDescription,
                  },
                })
              )
            )
            .catch((error) =>
              console.log("Caught an error while creating an answer", error)
            );
          break;
        case "answer":
          peer = peers.get(data.from);
          if (!peer) return;

          peer.pc
            .setRemoteDescription(new RTCSessionDescription(data.description))
            .catch((error) =>
              console.log("Caught an error while setting: answer", error)
            );
          break;
        default:
          break;
      }
    });
  }, [peers]);

  const handleOnIceCandidate = (
    { candidate }: RTCPeerConnectionIceEvent,
    target: string
  ) => {
    if (!candidate) return;

    socket.send(
      JSON.stringify({
        type: "ice-candidate",
        data: {
          from: me.id,
          target: target,
          candidate: candidate,
        },
      })
    );
  };

  const createPeer = (user: User, host: boolean) => {
    let peer: Peer = {
      pc: new RTCPeerConnection({
        iceServers: [
          {
            urls: "stun:openrelay.metered.ca:80",
          },
          {
            urls: "turn:openrelay.metered.ca:80",
            username: "openrelayproject",
            credential: "openrelayproject",
          },
          {
            urls: "turn:openrelay.metered.ca:443",
            username: "openrelayproject",
            credential: "openrelayproject",
          },
        ],
        iceTransportPolicy: "all",
      }),
      host,
      user,
      dc: undefined,
    };

    peer.pc.onicecandidate = (e) => handleOnIceCandidate(e, user.id);

    if (host) {
      peer.dc = peer.pc.createDataChannel(cuid());

      peer.dc.onopen = () => {
        if (openChat) {
          setMessages((messages) =>
            messages.map((m) =>
              m.author.id !== openChat.id ? m : { ...m, read: true }
            )
          );
        }
        setPeers(new Map(peers));
      };
      peer.dc.onmessage = (e) => {
        const { type, data } = JSON.parse(e.data);
        if (type === "message") setMessages((messages) => [...messages, data]);
      };
      peer.dc.onclose = () => {
        removePeer(user.id);
        toast(`Chat with ${user.username} has been terminated`);
      };
    } else {
      peer.pc.ondatachannel = (e) => {
        peer.dc = e.channel;

        peer.dc.onopen = () => {
          if (openChat) {
            setMessages((messages) =>
              messages.map((m) =>
                m.author.id !== openChat.id ? m : { ...m, read: true }
              )
            );
          }
          setPeers(new Map(peers));
        };
        peer.dc.onmessage = (e) => {
          const { type, data } = JSON.parse(e.data);
          if (type === "message")
            setMessages((messages) => [...messages, data]);
        };
        peer.dc.onclose = () => {
          removePeer(user.id);
          toast(`Chat with ${user.username} has been terminated`);
        };

        peers.set(user.id, peer);
      };
    }

    peers.set(user.id, peer);
  };

  const removePeer = (userID: string) => {
    let peer = peers.get(userID);
    if (!peer) return;

    if (openChat?.id === userID) {
      setOpenChat(null);
    }

    peer.dc?.close();
    peer.dc = undefined;
    peer.pc.onicecandidate = null;
    peers.delete(userID);

    setMessages((messages) =>
      messages.filter((m) => m.author.id !== userID && m.target.id !== userID)
    );
  };

  const sendInvite = (user: User) => {
    if (invitedUsers.includes(user)) return;

    let invited = false;
    chatInvites.forEach((u) => {
      if (u.id === user.id) {
        toast(`${user.username} has invited you already`);
        invited = true;
      }
    });
    if (invited) return;

    createPeer(user, true);
    socket.send(
      JSON.stringify({
        type: "chatInvite",
        data: {
          target: user.id,
          from: me,
        },
      })
    );
    setInvitedUsers((users) => [...users, user]);
  };

  const cancelInvite = (user: User) => {
    if (!invitedUsers.includes(user)) return;

    socket.send(
      JSON.stringify({
        type: "chatInviteCancel",
        data: {
          target: user.id,
          from: me,
        },
      })
    );

    setInvitedUsers((users) => users.filter((u) => u.id !== user.id));
  };

  const acceptInvite = (user: User) => {
    createPeer(user, false);

    socket.send(
      JSON.stringify({
        type: "chatInviteRes",
        data: {
          from: me,
          target: user.id,
          response: true,
        },
      })
    );

    setChatInvites((invites) => invites.filter((u) => u.id !== user.id));
    setViewInvite(null);
  };

  const rejectInvite = (user: User) => {
    socket.send(
      JSON.stringify({
        type: "chatInviteRes",
        data: {
          from: me,
          target: user.id,
          response: false,
        },
      })
    );

    setChatInvites((invites) => invites.filter((u) => u.id !== user.id));
    setViewInvite(null);
  };

  return (
    <>
      {/* modals */}
      <input type="checkbox" id="handleInvite" className="modal-toggle" />
      <label htmlFor="handleInvite" className="modal bg-base-300 bg-opacity-60">
        <label
          className="modal-box flex flex-col items-center gap-8"
          htmlFor=""
        >
          {viewInvite ? (
            <>
              <p className="text-lg text-center">
                <span className="font-bold">{viewInvite.username}</span> sent
                you a chat invitation!
              </p>
              <div className="flex flex-row items-center gap-8">
                <button className="" onClick={() => rejectInvite(viewInvite)}>
                  Reject
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => acceptInvite(viewInvite)}
                >
                  Accept
                </button>
              </div>
            </>
          ) : (
            <>
              <p>Invite has been cancelled.</p>
              <p>Click anywhere to exit.</p>
            </>
          )}
        </label>
      </label>

      <div className="h-screen flex flex-col bg-base-300">
        <header className="navbar h-16 border-b">
          <div className="navbar-start"></div>
          <div className="navbar-center">
            <span className="text-xl">Loquor</span>
          </div>
          <div className="navbar-end">
            <img
              className="rounded w-10 h-10"
              src={`https://ui-avatars.com/api/?name=${me.username}`}
              alt="Me"
            />
          </div>
        </header>

        <main className="w-full border-b p-4">
          <h1 className="text-center">
            Chat with others...{" "}
            <span className="font-semibold">privately!</span>
          </h1>
        </main>

        <div className="flex-grow flex flex-col sm:flex-row overflow-y-auto min-h-0">
          {/* chats */}
          <div className="w-full sm:max-w-[100px] min-h-16 sm:h-full flex flex-row sm:flex-col items-center sm:px-0 border-b sm:border-r gap-2 sm:gap-4">
            <div className="w-fit px-4 h-16 flex flex-col items-center justify-center">
              <SiGooglechat size={32} className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            {/* chat invites */}
            <div
              ref={parent}
              className="w-full h-full flex flex-row sm:flex-col items-center gap-4 overflow-x-auto overflow-y-hidden p-2 sm:overflow-y-auto sm:overflow-x-hidden"
            >
              {chatInvites.map((u) => (
                <label
                  key={u.id}
                  className="relative min-w-fit min-h-fit cursor-pointer bg-base-100 border p-2 rounded"
                  htmlFor="handleInvite"
                  onClick={() => setViewInvite(u)}
                >
                  <span className="z-50 absolute -top-0.5 -right-0.5 badge rounded-full px-[2px] py-[4px] flex items-center justify-center">
                    <HiUserAdd size={16} />
                  </span>
                  <img
                    className="rounded w-8 h-8 sm:w-12 sm:h-12"
                    src={`https://ui-avatars.com/api/?name=${u.username}`}
                    alt={u.username}
                  />
                </label>
              ))}
              {/* open chats */}
              {Array.from(peers).map(
                ([k, v]) =>
                  v.dc?.readyState === "open" &&
                  k !== openChat?.id && (
                    <PeerView
                      key={k}
                      messages={messages}
                      openChat={openChat}
                      setOpenChat={setOpenChat}
                      setMessages={setMessages}
                      peer={v}
                    />
                  )
              )}
            </div>
          </div>
          {openChat && peers.get(openChat.id)?.dc?.readyState === "open" ? (
            <ChatView
              me={me}
              user={openChat}
              messages={messages}
              removePeer={removePeer}
              setMessages={setMessages}
              setOpenChat={setOpenChat}
              dc={peers.get(openChat.id)?.dc!}
            />
          ) : (
            <UsersView
              users={users.filter(
                (user) =>
                  user.id !== me.id &&
                  !(peers.get(user.id)?.dc?.readyState === "open")
              )}
              invitedUsers={invitedUsers}
              sendInvite={sendInvite}
              cancelInvite={cancelInvite}
            />
          )}
        </div>
      </div>
    </>
  );
};

const App: React.FC = () => {
  const [username, setUsername] = React.useState<string | null>(null);
  const [me, setMe] = React.useState<User | null>(null);

  const socket = useSocketServer({ username, setMe });

  if (!username) {
    return <LoginView setUsername={setUsername} />;
  }

  if (!me || !socket)
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
              src={`https://ui-avatars.com/api/?name=?`}
              alt="Me"
            />
          </div>
        </header>

        <main className="w-full border-b p-4">
          <h1 className="text-center">
            Chat with others...{" "}
            <span className="font-semibold">privately!</span>
          </h1>
        </main>

        <div className="flex-grow flex flex-col items-center justify-center">
          <Loader size={"xl"} variant="oval" color="green" />
        </div>
      </div>
    );

  return <HomeView me={me} socket={socket} />;
};

export default App;
