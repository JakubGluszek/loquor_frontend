import React, { memo } from "react";
import toast from "react-hot-toast";
import { MdKeyboardArrowRight, MdClose } from "react-icons/md";
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
}

interface Peer {
  pc: RTCPeerConnection;
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
    <div className="min-h-screen w-screen flex items-center justify-center">
      <div className="flex flex-col gap-4 border  p-4">
        <input
          placeholder="Username"
          ref={usernameRef}
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

  return (
    <>
      <div ref={messagesRef} className="overflow-y-auto min-h-0 flex flex-col">
        {messages.map((message) => (
          <div key={cuid()} className="flex flex-row gap-2 p-2 border-b">
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
          className="flex-grow input input-bordered"
          onChange={(e) => setMessage(e.currentTarget.value)}
        />
        <button className="btn btn-primary" onClick={() => send()}>
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
  const [invitedUser, setInvitedUser] = React.useState<User | null>(null);
  const [chatInvites, setChatInvites] = React.useState<User[]>([]);
  const [openChat, setOpenChat] = React.useState<User | null>(null);
  const [messages, setMessages] = React.useState<Message[]>([]);

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
          toast(`${data.user.username} has invited you to chat!`);
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
            setInvitedUser(null);

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
              .then(() =>
                console.log("Offer created & set as local description.")
              )
              .catch((error) =>
                console.log("Error while creating offer", error)
              );
          } else {
            toast("Chat offer rejected");
            removePeer(data.from.id);
            setInvitedUser(null);
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
            .then(() => console.log("Offer set!"))
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
            .then(() => console.log("Answer created!"))
            .catch((error) =>
              console.log("Caught an error while creating an answer", error)
            );
          break;
        case "answer":
          if (!peers[data.from]) return;
          peers[data.from].pc
            .setRemoteDescription(new RTCSessionDescription(data.description))
            .then(() => console.log("Answer set as remote description"))
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
        console.log("new data channel");

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
    if (invitedUser) {
      if (user.id === invitedUser.id) return;
      socket.send(
        JSON.stringify({
          type: "chatInviteCancel",
          data: {
            target: invitedUser.id,
            from: me,
          },
        })
      );
    }

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
    setInvitedUser(user);
  };

  const cancelInvite = () => {
    if (!invitedUser) return;

    socket.send(
      JSON.stringify({
        type: "chatInviteCancel",
        data: {
          target: invitedUser.id,
          from: me,
        },
      })
    );
    setInvitedUser(null);
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

    chatInvites.forEach((u) => {
      if (u.id === user.id) return;
      socket.send(
        JSON.stringify({
          type: "chatInviteRes",
          data: {
            from: me,
            target: u.id,
            response: false,
          },
        })
      );
    });
    setChatInvites([]);
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
  };

  const sendMessage = (userID: string, message: Message) => {
    console.log(peers[userID]);
    peers[userID].dc?.send(message.body);
    setMessages((messages) => [...messages, message]);
  };

  return (
    <div className="h-screen flex flex-col gap-2">
      <header className="navbar h-16 border-b">
        <div className="navbar-start">
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

      <main className="w-full">
        <h1 className="text-center">
          Chat with others... <span className="font-semibold">privately!</span>
        </h1>
      </main>

      <div className="flex-grow flex flex-row overflow-y-auto min-h-0">
        {/* users online */}
        <div className="min-w-[80px] flex flex-col items-center border gap-4 py-2">
          {users
            .filter((user) => user.id !== me.id)
            .map((user) => (
              <div
                key={user.id}
                className="z-50 cursor-pointer tooltip tooltip-right"
                data-tip={`Invite ${user.username} to chat`}
                onClick={() => {
                  if (openChat?.id === user.id) return;
                  if (peers[user.id]) setOpenChat(user);
                  else sendInvite(user);
                }}
              >
                <img
                  className="rounded w-12 h-12"
                  src={`https://ui-avatars.com/api/?name=${user.username}`}
                  alt={user.username}
                />
              </div>
            ))}
        </div>
        <div className="relative flex-grow border-t flex flex-col">
          {chatInvites.length > 0 && (
            <div className="h-fit flex flex-col gap-1 p-2 border-b">
              {chatInvites.map((u) => (
                <div key={u.id} className="flex flex-row items-center gap-1">
                  <div className="grow">{u.username} invited you to chat!</div>
                  <div className="flex flex-row items-center gap-1">
                    <button
                      className="btn btn-sm"
                      onClick={() => acceptInvite(u)}
                    >
                      Accept
                    </button>
                    <button
                      className="btn btn-sm"
                      onClick={() => rejectInvite(u)}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {invitedUser && !openChat && (
            <div className="grow flex flex-col items-center justify-center gap-2">
              <p>Waiting for {invitedUser.username} to respond</p>
              <button className="btn" onClick={() => cancelInvite()}>
                Cancel
              </button>
            </div>
          )}
          {openChat && (
            <>
              <div className="flex flex-row items-center gap-2 p-2">
                <div className="grow text-lg">
                  Chatting with{" "}
                  <span className="font-bold">{openChat.username}</span>
                </div>
                <button className="btn" onClick={() => setOpenChat(null)}>
                  Close
                </button>
                <button
                  className="btn"
                  onClick={() => {
                    setOpenChat(null);
                    removePeer(openChat.id);
                  }}
                >
                  Terminate
                </button>
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
            </>
          )}
          {!invitedUser && !openChat && <div>ain't nothing happening</div>}
        </div>
      </div>
    </div>
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
