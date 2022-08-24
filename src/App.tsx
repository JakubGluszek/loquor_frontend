import React from "react";
import toast from "react-hot-toast";
import { MdKeyboardArrowRight, MdClose } from "react-icons/md";
import cuid from "cuid";

interface User {
  id: string;
  username: string;
}

interface Chat {
  user: User | null;
  open: boolean;
  status: "pending" | null;
  host: boolean;
}

interface ChatOffer {
  from: User | null;
}

const WEBSOCKET_URL = "ws://0.0.0.0:8000/";

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

interface ChatViewProps {
  socket: WebSocket;
  chat: Chat;
  me: User;
  setChat: (chat: Chat) => void;
}

interface Message {
  author: User;
  body: string;
}

const ChatView: React.FC<ChatViewProps> = ({ socket, chat, me, setChat }) => {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [message, setMessage] = React.useState("");
  const [pc, setPc] = React.useState(new RTCPeerConnection());
  const [dc, setDc] = React.useState<RTCDataChannel | null>(null);

  const sendMessage = () => {
    dc?.send(message);
    setMessages([...messages, { author: me, body: message }]);
    setMessage("");
  };

  pc.oniceconnectionstatechange = function () {
    if (pc.iceConnectionState == "disconnected") {
      setChat({ host: false, user: null, open: false, status: null });
    }
  };

  pc.onicecandidate = (e) => {
    socket.send(
      JSON.stringify({
        type: "ice-candidate",
        data: {
          from: me.id,
          to: chat.user?.id,
          candidate: e.candidate,
        },
      })
    );
  };

  const handleExit = () => {
    pc.close();
    setChat({ ...chat, open: false, user: null });
  };

  React.useEffect(() => {
    var dataChannel;

    const handleMessages = (e: MessageEvent) => {
      setMessages([...messages, { author: chat.user!, body: e.data }]);
    };

    if (chat.host) {
      dataChannel = pc.createDataChannel("chat");

      dataChannel.addEventListener("message", (e) => handleMessages(e));

      setDc(dataChannel);
    } else {
      pc.ondatachannel = (e) => {
        dataChannel = e.channel;

        dataChannel.addEventListener("message", (e) => handleMessages(e));

        setDc(dataChannel);
      };
    }
  }, [messages]);

  React.useEffect(() => {
    if (!chat.host) return;

    pc.createOffer()
      .then((offer) => pc.setLocalDescription(offer))
      .then(() =>
        socket.send(
          JSON.stringify({
            type: "offer",
            data: {
              from: me.id,
              to: chat.user!.id,
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
      var { type, data } = JSON.parse(e.data);

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
                    to: data.from,
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
            // .then(() =>
            //   socket.send(
            //     JSON.stringify({
            //       type: "answer",
            //       data: {
            //         from: me.id,
            //         to: data.from,
            //         description: pc.localDescription,
            //       },
            //     })
            //   )
            // )
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
    return () => socket.removeEventListener("message", handleEvents);
  }, []);

  return (
    <>
      <div className="h-8 flex flex-row items-center gap-2 p-2 border-b ">
        <span className="grow">Chatting with {chat.user?.username}</span>
        <MdClose size={24} onClick={() => handleExit()} />
      </div>
      <div className="relative grow flex flex-col">
        <div className="grow flex flex-col gap-2 p-2">
          {messages.map((message) => (
            <div key={cuid()} className="flex flex-col border">
              <div
                className={`flex flex-col gap-0.5 ${
                  message.author.id === me.id ? "items-end" : ""
                }`}
              >
                <p className="font-semibold">{message.author.username}</p>
                <p>{message.body}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="absolute bottom-0 w-full flex flex-row gap-2 p-2 border-y">
          <input
            className="grow input input-bordered"
            value={message}
            onChange={(e) => setMessage(e.currentTarget.value)}
          />
          <button className="btn" onClick={() => sendMessage()}>
            Send
          </button>
        </div>
      </div>
    </>
  );
};

interface MainViewProps {
  username: string;
}

const MainView: React.FC<MainViewProps> = ({ username }) => {
  const [socket, setSocket] = React.useState<WebSocket | null>(null);
  const [chat, setChat] = React.useState<Chat>({
    user: null,
    open: false,
    status: null,
    host: false,
  });
  const [chatOffer, setChatOffer] = React.useState<ChatOffer>({
    from: null,
  });

  const [me, setMe] = React.useState<User | null>(null);
  const [users, setUsers] = React.useState<User[]>([]);

  const addUser = (user: User) => {
    setUsers([...users, user]);
  };

  const removeUser = (userId: string) => {
    setUsers(users.filter((user) => user.id !== userId));
  };

  const handleChatAccept = () => {
    if (!chatOffer.from) return;

    setChat({ open: true, user: chatOffer.from, status: null, host: false });
    socket?.send(
      JSON.stringify({
        type: "chatInviteRes",
        data: {
          from: me,
          to: chatOffer.from.id,
          res: true,
        },
      })
    );
    setChatOffer({ from: null });
  };

  const handleChatReject = () => {
    if (!chatOffer.from) return;
    socket?.send(
      JSON.stringify({
        type: "chatInviteRes",
        data: {
          from: me,
          to: chatOffer.from.id,
          res: false,
        },
      })
    );

    setChatOffer({ from: null });
  };

  const sendChatOffer = (user: User) => {
    socket?.send(
      JSON.stringify({
        type: "chatInvite",
        data: {
          from: me,
          to: user.id,
        },
      })
    );
    setChat({ open: false, user: user, status: "pending", host: true });
  };

  React.useEffect(() => {
    if (socket || !username) return;

    const connection = new WebSocket(WEBSOCKET_URL + username);
    setSocket(connection);

    connection.addEventListener("message", (e) => {
      var { type, data } = JSON.parse(e.data);
      switch (type) {
        case "setMe":
          // data: User
          setMe(data);
          break;
        case "addUser":
          // data: User
          addUser(data);
          break;
        case "removeUser":
          // data: userId
          removeUser(data);
          break;
        case "setUsers":
          // data: User[]
          setUsers(data);
          break;
        case "chatInvite":
          // data: {from, to}
          setChatOffer({ from: data.from });
          toast("New chat offer");
          break;
        case "chatInviteRes":
          // data: {from: User, to, res: boolean}
          if (data.res === false) {
            toast.error(`${data.from.username} rejected your chat offer`);
            setChat({ open: chat.open, status: null, user: null, host: false });
          }

          if (data.res === true) {
            toast.success(`${data.from.username} accepted your chat offer`);
            setChat({ user: data.from, open: true, status: null, host: true });
          }
          break;
        default:
          break;
      }
    });

    return () => connection?.close();
  }, [username]);

  if (!me) return null;

  return (
    <div className="mx-auto h-screen max-w-screen-md flex flex-col items-center">
      <header className="navbar h-16">
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

      <main className="w-full border flex flex-col items-center p-2">
        <h1>A peer to peer chat app application.</h1>
        {chatOffer.from && (
          <div className="flex flex-row items-center gap-2">
            <span>{chatOffer.from.username} wants to chat - </span>
            <button className="btn" onClick={() => handleChatAccept()}>
              Accept
            </button>
            <button className="btn" onClick={() => handleChatReject()}>
              Reject
            </button>
          </div>
        )}
      </main>
      <div className="grow w-full max-w-screen-md flex flex-row">
        {/* sidebar */}
        <div className="grow max-w-[80px] flex flex-col gap-1 border-x">
          {/* view more */}
          <div
            className="h-8 flex flex-row gap-1 items-center justify-center cursor-pointer tooltip border-b"
            data-tip="Show more"
          >
            <MdKeyboardArrowRight size={32} />
          </div>
          {/* users */}
          <div className="flex flex-col">
            {/* all */}
            <div className="flex flex-col items-center gap-2 py-2">
              {users
                .filter((user) => user.id !== me.id)
                .map((user) => (
                  <div
                    key={user.id}
                    className="cursor-pointer"
                    onClick={() => sendChatOffer(user)}
                  >
                    <img
                      className="rounded w-12 h-12"
                      src={`https://ui-avatars.com/api/?name=${user.username}`}
                      alt={user.username}
                    />
                  </div>
                ))}
            </div>
          </div>
        </div>
        {/* Chat area */}
        <div className="grow flex flex-col border-r">
          {chat.open && chat.user && socket ? (
            <ChatView socket={socket} chat={chat} me={me} setChat={setChat} />
          ) : (
            <div className="grow flex flex-col items-center justify-center">
              {chat.status === "pending" ? (
                <span>Chat offer sent, please wait patiently</span>
              ) : (
                <span>Click on a user to request a chatting session</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [username, setUsername] = React.useState<string | null>(null);

  if (!username) {
    return <LoginView setUsername={setUsername} />;
  }

  return <MainView username={username} />;
};

export default App;
