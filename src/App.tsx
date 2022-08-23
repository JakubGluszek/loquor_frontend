import React from "react";
import toast from "react-hot-toast";
import { MdKeyboardArrowRight } from "react-icons/md";

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
    <div className="h-screen w-screen flex items-center justify-center">
      <div className="flex flex-col gap-4 border border-base-300 p-4">
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
  user: User;
  me: User;
  host: boolean;
}

const ChatView: React.FC<ChatViewProps> = ({ socket, user, me, host }) => {
  const [message, setMessage] = React.useState("");
  const [pc, setPc] = React.useState(new RTCPeerConnection());
  const [dc, setDc] = React.useState<RTCDataChannel | null>(null);

  pc.onicecandidate = () => {
    console.log("New Ice Candidate");

    socket.send(
      JSON.stringify({
        type: "ice",
        data: {
          from: me.id,
          to: user.id,
          description: pc.localDescription,
        },
      })
    );
  };

  pc.ondatachannel = (e) => {
    let dataChannel = e.channel;

    dataChannel.onopen = () => console.log("Connection is open!");
    dataChannel.onmessage = (e) => console.log("Message received: ", e.data);

    setDc(dataChannel);
  };

  const sendMessage = () => {
    dc?.send(message);
    setMessage("");
  };

  React.useEffect(() => {
    if (host) {
      const dc = pc.createDataChannel("channel");

      dc.onopen = () => console.log("Connection is open!");
      dc.onmessage = (e) => console.log("Received a message: " + e.data);

      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .then(() => console.log("Offer created & set as local description."));

      setDc(dc);
    }
  }, []);

  React.useEffect(() => {
    socket.addEventListener("message", (e) => {
      var { type, data } = JSON.parse(e.data);
      switch (type) {
        case "ice":
          if (data.description.type === "offer") {
            pc.setRemoteDescription(data.description).then(() =>
              console.log("Offer set!")
            );
            pc.createAnswer()
              .then((answer) => pc.setLocalDescription(answer))
              .then(() => console.log("Answer created!"));
          } else if (data.description.type === "answer") {
            pc.setRemoteDescription(data.description);
          }
          break;
        default:
          break;
      }
    });
  }, []);

  return (
    <div>
      <input
        value={message}
        onChange={(e) => setMessage(e.currentTarget.value)}
        className="input input-bordered"
      />
      <button className="btn" onClick={() => sendMessage()}>
        Send
      </button>
    </div>
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

    socket?.send(
      JSON.stringify({
        type: "chatOfferRes",
        data: {
          from: me,
          to: chatOffer.from.id,
          res: true,
        },
      })
    );

    setChat({ open: true, user: chatOffer.from, status: null, host: false });
    setChatOffer({ from: null });
  };

  const handleChatReject = () => {
    if (!chatOffer.from) return;
    socket?.send(
      JSON.stringify({
        type: "chatOfferRes",
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
        type: "chatOffer",
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
        case "chatOffer":
          // data: {from, to}
          setChatOffer({ from: data.from });
          toast("New chat offer");
          break;
        case "chatOfferRes":
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
    <div className="mx-auto min-h-screen max-w-screen-md flex flex-col items-center">
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

      <main className="w-full border border-base-300 flex flex-col items-center p-2">
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
        <div className="grow max-w-[80px] flex flex-col gap-1 border-x border-base-300">
          {/* view more */}
          <div
            className="flex flex-row gap-1 items-center justify-center cursor-pointer tooltip"
            data-tip="Show more"
          >
            <MdKeyboardArrowRight size={32} />
          </div>
          {/* users */}
          <div className="flex flex-col border-t border-base-300">
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
        <div className="grow flex flex-col border-r border-base-300">
          {chat.open && chat.user && socket ? (
            <ChatView
              socket={socket}
              user={chat.user}
              me={me}
              host={chat.host}
            />
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
