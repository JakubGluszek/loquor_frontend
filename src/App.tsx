import React, { memo } from "react";
import toast from "react-hot-toast";
import { MdClose, MdOutlineExitToApp, MdSearch } from "react-icons/md";
import {
  AiOutlineSortAscending,
  AiOutlineSortDescending,
} from "react-icons/ai";
import { SiGooglechat } from "react-icons/si";
import cuid from "cuid";

const WEBSOCKET_URL = "ws://0.0.0.0:8000/";

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
}

interface Peer {
  pc: RTCPeerConnection;
  user: User;
  host: boolean;
  dc?: RTCDataChannel;
}

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
    <div className="min-h-screen w-screen flex flex-col gap-8 items-center justify-center">
      <h1 className="text-2xl">Welcome to Loquor</h1>
      <p className="text-center">
        A platform where you can chat with other using a peer to peer
        connection.
      </p>
      <div className="flex flex-col gap-4 border  p-4">
        <input
          placeholder="Username"
          ref={usernameRef}
          onKeyUp={(e) =>
            e.key === "Enter" && setUsername(usernameRef.current!.value)
          }
          className="input input-bordered"
          type="text"
        />
        <button
          className="btn"
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
  sendMessage: (userID: string, message: Message) => void;
}

const ChatView: React.FC<ChatViewProps> = ({
  me,
  user,
  messages,
  sendMessage,
}) => {
  const [message, setMessage] = React.useState("");
  const messagesRef = React.useRef<HTMLDivElement>(null);

  const send = () => {
    sendMessage(user.id, { author: me, target: user, body: message });
    setMessage("");
  };

  React.useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight });
  }, [messages]);

  return (
    <>
      <div ref={messagesRef} className="overflow-y-auto min-h-0 flex flex-col">
        {messages.map((message) => (
          <div key={cuid()} className="flex flex-row gap-2 p-2 sm:p-4 border-b">
            <img
              className="rounded w-10 h-10"
              src={`https://ui-avatars.com/api/?name=${message.author.username}`}
              alt={message.author.username}
            />
            <div className="flex flex-col gap-2">
              <span className="text-lg font-bold">
                {message.author.username}
              </span>
              <p className="">{message.body}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-auto w-full flex flex-row items-center gap-4 p-2 bg-base-100 border-t">
        <input
          type="text"
          value={message}
          onKeyUp={(e) => e.key === "Enter" && send()}
          className="flex-grow input input-bordered input-sm sm:input-md"
          onChange={(e) => setMessage(e.currentTarget.value)}
        />
        <button
          className="btn btn-primary btn-sm sm:btn-md"
          onClick={() => send()}
        >
          Send
        </button>
      </div>
    </>
  );
};

interface HomeViewProps {
  me: User;
  socket: WebSocket;
}

const HomeView: React.FC<HomeViewProps> = ({ me, socket }) => {
  const [users, setUsers] = React.useState<User[]>([]);
  const [invitedUsers, setInvitedUsers] = React.useState<User[]>([]);
  const [chatInvites, setChatInvites] = React.useState<User[]>([]);
  const [openChat, setOpenChat] = React.useState<User | null>(null);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [viewInvite, setViewInvite] = React.useState<User | null>(null);

  const [peers, setPeers] = React.useState<{
    [userID: string]: Peer;
  }>({});

  React.useEffect(() => {
    socket.send(JSON.stringify({ type: "getUsers", data: {} }));
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
          break;
        default:
          break;
      }
    });
  }, []);

  React.useEffect(() => {
    socket.addEventListener("message", (e) => {
      const { type, data }: EventData = JSON.parse(e.data);

      switch (type) {
        case "chatInviteRes":
          if (data.response === true) {
            if (!peers[data.from.id]) return;
            toast("Chat offer accepted");
            setInvitedUsers((users) =>
              users.filter((user) => user.id !== data.from.id)
            );

            peers[data.from.id].dc = peers[data.from.id].pc.createDataChannel(
              cuid()
            );

            peers[data.from.id].dc!.onopen = () => setOpenChat(data.from);
            peers[data.from.id].dc!.onmessage = (e) =>
              setMessages((messages) => [
                ...messages,
                { author: data.from, target: me, body: e.data },
              ]);
            peers[data.from.id].dc!.onclose = () => {
              setOpenChat(null);
              removePeer(data.from.id);
              toast(`Chat with ${data.from.username} has been terminated`);
            };

            peers[data.from.id].pc
              .createOffer()
              .then((offer) =>
                peers[data.from.id].pc.setLocalDescription(offer)
              )
              .then(() =>
                socket.send(
                  JSON.stringify({
                    type: "offer",
                    data: {
                      from: me.id,
                      target: data.from.id,
                      description: peers[data.from.id].pc.localDescription,
                    },
                  })
                )
              )
              .catch((error) =>
                console.log("Error while creating offer", error)
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
          if (!peers[data.from]) return;
          peers[data.from].pc.addIceCandidate(data.candidate);
          break;
        case "offer":
          if (!peers[data.from]) return;
          peers[data.from].pc
            .setRemoteDescription(new RTCSessionDescription(data.description))
            .catch((error) =>
              console.log("Caught an error while setting: offer", error)
            );
          peers[data.from].pc
            .createAnswer()
            .then((answer) => peers[data.from].pc.setLocalDescription(answer))
            .then(() =>
              socket.send(
                JSON.stringify({
                  type: "answer",
                  data: {
                    from: me.id,
                    target: data.from,
                    description: peers[data.from].pc.localDescription,
                  },
                })
              )
            )
            .catch((error) =>
              console.log("Caught an error while creating an answer", error)
            );
          break;
        case "answer":
          if (!peers[data.from]) return;
          peers[data.from].pc
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

  const createPeer = (user: User, host: boolean) => {
    let peer: Peer = {
      pc: new RTCPeerConnection(),
      host,
      user,
      dc: undefined,
    };

    peer.pc.onicecandidate = (e) => {
      socket.send(
        JSON.stringify({
          type: "ice-candidate",
          data: {
            from: me.id,
            target: user.id,
            candidate: e.candidate,
          },
        })
      );
    };

    if (!host) {
      peer.pc.ondatachannel = (e) => {
        let dc = e.channel;

        dc.onopen = () => setOpenChat(user);
        dc.onmessage = (e) =>
          setMessages((messages) => [
            ...messages,
            { author: user, target: me, body: e.data },
          ]);
        dc.onclose = () => {
          setOpenChat(null);
          removePeer(user.id);
          toast(`Chat with ${user.username} has been terminated`);
        };

        setPeers((peers) =>
          Object.assign(peers, { [user.id]: { ...peers[user.id], dc: dc } })
        );
      };
    }

    setPeers((peers) => Object.assign(peers, { [user.id]: peer }));
  };

  const removePeer = (userID: string) => {
    if (!peers[userID]) return;
    peers[userID]?.dc?.close();
    peers[userID].dc = undefined;
    peers[userID].pc.onicecandidate = null;
    delete peers[userID];
    setMessages((messages) =>
      messages.filter((m) => m.author.id !== userID && m.target.id !== userID)
    );
    setPeers(peers);
  };

  const sendInvite = (user: User) => {
    if (invitedUsers.includes(user)) return;

    socket.send(
      JSON.stringify({
        type: "chatInvite",
        data: {
          target: user.id,
          from: me,
        },
      })
    );

    createPeer(user, true);
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
    setChatInvites((invites) => invites.filter((u) => u.id !== user.id));

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
    setViewInvite(null);
  };

  const rejectInvite = (user: User) => {
    setChatInvites((invites) => invites.filter((u) => u.id !== user.id));

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

    setViewInvite(null);
  };

  const sendMessage = (userID: string, message: Message) => {
    peers[userID].dc?.send(message.body);
    setMessages((messages) => [...messages, message]);
  };

  return (
    <>
      {/* modals */}
      <input type="checkbox" id="handleInvite" className="modal-toggle" />
      <label htmlFor="handleInvite" className="modal bg-base-300 bg-opacity-60">
        {viewInvite && (
          <label
            className="modal-box flex flex-col items-center gap-8"
            htmlFor=""
          >
            <p className="text-lg text-center">
              <span className="font-bold">{viewInvite.username}</span> sent you
              a chat invitation!
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
          </label>
        )}
      </label>

      <div className="h-screen flex flex-col">
        <header className="navbar h-16 border-b">
          <div className="navbar-start"></div>
          <div className="navbar-center">
            <span className="text-xl">Loquor</span>
          </div>
          <div className="navbar-end">
            <img
              className="rounded w-12 h-12"
              src={`https://ui-avatars.com/api/?name=${me.username}`}
              alt="Me"
            />
          </div>
        </header>

        <main className="w-full border-b p-1">
          <h1 className="text-center">
            Chat with others...{" "}
            <span className="font-semibold">privately!</span>
          </h1>
        </main>

        <div className="flex-grow flex flex-row overflow-y-auto min-h-0">
          {/* chats */}
          <div className="min-w-[80px] sm:min-w-[100px] flex flex-col border-r">
            <div className="h-16 flex flex-col items-center justify-center">
              <SiGooglechat size={32} className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            {/* chat invites */}
            {chatInvites.length > 0 && (
              <div className="flex flex-col items-center -translate-y-[1px] py-2 border-y">
                <span className="text-xs">Invites</span>
                <div className="flex flex-col items-center gap-4 py-2">
                  {chatInvites.map((u) => (
                    <label
                      key={u.id}
                      className="cursor-pointer"
                      htmlFor="handleInvite"
                      onClick={() => setViewInvite(u)}
                    >
                      <img
                        className="rounded w-8 h-8 sm:w-12 sm:h-12"
                        src={`https://ui-avatars.com/api/?name=${u.username}`}
                        alt={u.username}
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}
            {/* open chats */}
            <div className="flex flex-col items-center gap-4 py-8">
              {Object.entries(peers).map(
                ([k, v]) =>
                  v.dc &&
                  k !== openChat?.id && (
                    <div
                      key={k}
                      className="cursor-pointer"
                      onClick={() => setOpenChat(v.user)}
                    >
                      <img
                        className="rounded w-8 h-8 sm:w-12 sm:h-12"
                        src={`https://ui-avatars.com/api/?name=${v.user.username}`}
                        alt={v.user.username}
                      />
                    </div>
                  )
              )}
            </div>
          </div>
          {openChat ? (
            <div className="flex-grow flex flex-col overflow-y-auto min-h-0">
              {/* current chat header */}
              <div className="min-h-16 flex flex-row items-center flex-wrap gap-4 p-2 px-4 bg-base-200 border-b">
                <img
                  className="rounded w-8 h-8 sm:w-10 sm:h-10"
                  src={`https://ui-avatars.com/api/?name=${openChat.username}`}
                  alt={openChat.username}
                />
                <span className="text-lg sm:text-2xl font-bold">
                  {openChat.username}
                </span>
                <div className="ml-auto flex flex-row items-center gap-4">
                  <button
                    className="btn btn-ghost hover:btn-primary btn-sm sm:btn-md"
                    onClick={() => setOpenChat(null)}
                  >
                    <MdClose size={24} />
                  </button>
                  <button
                    className="btn btn-ghost hover:btn-primary btn-sm sm:btn-md"
                    onClick={() => removePeer(openChat.id)}
                  >
                    <MdOutlineExitToApp size={24} />
                  </button>
                </div>
              </div>
              <ChatView
                me={me}
                user={openChat}
                messages={messages.filter(
                  (m) =>
                    m.author.id === openChat.id || m.target.id === openChat.id
                )}
                sendMessage={sendMessage}
              />
            </div>
          ) : (
            <div className="flex-grow flex flex-col overflow-y-auto min-h-0">
              <div className="h-16 flex flex-row items-center gap-4 px-4 border-b">
                <button className="">
                  <MdSearch size={24} className="sm:w-8 sm:h-8" />
                </button>
                <button className="">
                  <AiOutlineSortAscending size={24} className="sm:w-8 sm:h-8" />
                </button>
              </div>
              {/* users */}
              <div className="flex-grow flex flex-col gap-4 p-2 sm:p-4 overflow-x-hidden">
                {users.map(
                  (user) =>
                    user.id !== me.id &&
                    !peers[user.id]?.dc && (
                      <div
                        key={user.id}
                        className="flex flex-row flex-wrap items-center bg-base-200 gap-4 p-2 sm:p-4 rounded"
                      >
                        <img
                          className="rounded w-8 h-8 sm:w-12 sm:h-12"
                          src={`https://ui-avatars.com/api/?name=${user.username}`}
                          alt={user.username}
                        />
                        <span
                          className="text-lg sm:text-2xl font-bold tooltip tooltip-right"
                          data-tip={`ID: ${user.id}`}
                        >
                          {user.username}
                        </span>
                        {invitedUsers.includes(user) ? (
                          <button
                            className="ml-auto btn btn-secondary btn-sm sm:btn-md"
                            onClick={() => cancelInvite(user)}
                          >
                            Cancel invite
                          </button>
                        ) : (
                          <button
                            className="ml-auto btn btn-primary btn-sm sm:btn-md"
                            onClick={() => sendInvite(user)}
                          >
                            Invite to chat
                          </button>
                        )}
                      </div>
                    )
                )}
              </div>
            </div>
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

  if (!me || !socket) return <div>Connecting</div>;

  return <HomeView me={me} socket={socket} />;
};

export default App;
