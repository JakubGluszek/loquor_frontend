import React from "react";
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
  body: string;
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
    target: string; // peer.id
    candidate: RTCIceCandidateInit;
  };
}

interface EventSDPDescription {
  type: "offer" | "answer";
  data: {
    from: string; // me.id
    target: string; // peer.id
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
  peer: User;
  socket: WebSocket;
  host: boolean;
}

const ChatView: React.FC<ChatViewProps> = ({ me, peer, socket, host }) => {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [message, setMessage] = React.useState("");
  const [pc, setPc] = React.useState(new RTCPeerConnection());
  const [dc, setDc] = React.useState<RTCDataChannel | null>(null);

  const messagesRef = React.useRef<HTMLDivElement>(null);

  const sendMessage = () => {
    dc?.send(message);
    setMessages([...messages, { author: me, body: message }]);
    setMessage("");
  };

  pc.oniceconnectionstatechange = function () {
    if (pc.iceConnectionState == "disconnected") {
      console.log("ice connection state: disconnected");
    }
  };

  pc.onicecandidate = (e) => {
    socket.send(
      JSON.stringify({
        type: "ice-candidate",
        data: {
          from: me.id,
          target: peer.id,
          candidate: e.candidate,
        },
      })
    );
  };

  const handleExit = () => {
    console.log("handle exit here");
  };

  React.useEffect(() => {
    var dataChannel;

    const handleMessages = (e: MessageEvent) => {
      setMessages((messages) => [...messages, { author: peer, body: e.data }]);
    };

    if (host) {
      dataChannel = pc.createDataChannel("chat");

      dataChannel.addEventListener("message", (e) => handleMessages(e));
      dataChannel.addEventListener("close", () => handleExit());

      setDc(dataChannel);
    } else {
      pc.ondatachannel = (e) => {
        dataChannel = e.channel;

        dataChannel.addEventListener("message", (e) => handleMessages(e));
        dataChannel.addEventListener("close", () => handleExit());

        setDc(dataChannel);
      };
    }
  }, []);

  React.useEffect(() => {
    if (!host) return;

    pc.createOffer()
      .then((offer) => pc.setLocalDescription(offer))
      .then(() =>
        socket.send(
          JSON.stringify({
            type: "offer",
            data: {
              from: me.id,
              target: peer.id,
              description: pc.localDescription,
            },
          })
        )
      )
      .then(() => console.log("Offer created & set as local description."))
      .catch((error) => console.log("Error while creating offer", error));
  }, []);

  React.useEffect(() => {
    const handleEvents = async (e: MessageEvent) => {
      const { type, data }: EventData = JSON.parse(e.data);

      switch (type) {
        case "ice-candidate":
          pc.addIceCandidate(data.candidate);
          break;
        case "offer":
          await pc
            .setRemoteDescription(new RTCSessionDescription(data.description))
            .then(() => console.log("Offer set!"))
            .catch((error) =>
              console.log("Caught an error while setting: offer", error)
            );
          await pc
            .createAnswer()
            .then((answer) => pc.setLocalDescription(answer))
            .then(() =>
              socket.send(
                JSON.stringify({
                  type: "answer",
                  data: {
                    from: me.id,
                    target: data.from,
                    description: pc.localDescription,
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
          await pc
            .setRemoteDescription(new RTCSessionDescription(data.description))
            .then(() => console.log("Answer set as remote description"))
            .catch((error) =>
              console.log("Caught an error while setting: answer", error)
            );
          break;
        default:
          break;
      }
    };

    socket.addEventListener("message", (e) => handleEvents(e));
    return () => socket.removeEventListener("message", (e) => handleEvents(e));
  }, []);

  React.useEffect(() => {
    messagesRef.current?.scrollTo({top: messagesRef.current.scrollHeight})
  }, [messages]);

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
        <button className="btn btn-primary" onClick={() => sendMessage()}>
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
  const [chatInvites, setChatInvites] = React.useState<ChatInvite[]>([]);
  const [peer, setPeer] = React.useState<User | null>(null);

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
          setUsers((users) => users.filter((user) => user.id !== data.id));
          break;
        case "chatInvite":
          toast(`${data.user.username} has invited you to chat!`);
          setChatInvites((chatInvites) => [...chatInvites, data]);
          break;
        case "chatInviteCancel":
          setChatInvites((chatInvites) =>
            chatInvites.filter((c) => c.user.id !== data.user.id)
          );
          break;
        case "chatInviteRes":
          if (data.response === true) {
            setPeer(data.from);
          } else {
            toast("Chat offer rejected");
            setInvitedUser(null);
          }
          break;
        default:
          break;
      }
    });
  }, []);

  const sendChatInvite = (user: User) => {
    setInvitedUser(user);

    socket.send(
      JSON.stringify({
        type: "chatInvite",
        data: {
          target: user.id,
          from: me,
        },
      })
    );
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
    setPeer(user);

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

    chatInvites.forEach((invite) => {
      if (invite.user.id === user.id) return;
      socket.send(
        JSON.stringify({
          type: "chatInviteRes",
          data: {
            from: me,
            target: invite.user.id,
            response: false,
          },
        })
      );
    });
    setChatInvites([]);
  };

  const rejectInvite = (user: User) => {
    setChatInvites((invites) =>
      invites.filter((invite) => invite.user.id !== user.id)
    );

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
        <div className="min-w-[80px] flex flex-col items-center border py-2">
          {users
            .filter((user) => user.id !== me.id)
            .map((user) => (
              <div
                key={user.id}
                className="cursor-pointer tooltip tooltip-right"
                data-tip={`Invite ${user.username} to chat`}
                onClick={() => sendChatInvite(user)}
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
              {chatInvites.map((invite) => (
                <div
                  key={invite.user.id}
                  className="flex flex-row items-center gap-1"
                >
                  <div className="grow">
                    {invite.user.username} invited you to chat!
                  </div>
                  <div className="flex flex-row items-center gap-1">
                    <button
                      className="btn btn-sm"
                      onClick={() => acceptInvite(invite.user)}
                    >
                      Accept
                    </button>
                    <button
                      className="btn btn-sm"
                      onClick={() => rejectInvite(invite.user)}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {invitedUser && !peer && (
            <div className="grow flex flex-col items-center justify-center gap-2">
              <p>Waiting for {invitedUser.username} to respond</p>
              <button className="btn" onClick={() => cancelInvite()}>
                Cancel
              </button>
            </div>
          )}
          {peer && (
            <ChatView
              me={me}
              peer={peer}
              socket={socket}
              host={invitedUser ? true : false}
            />
          )}
          {!invitedUser && !peer && <div>ain't nothing happening</div>}
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
