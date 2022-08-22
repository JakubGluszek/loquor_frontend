import React from "react";
import { MdKeyboardArrowRight } from "react-icons/md";

interface User {
  id: string;
  username: string;
}

interface Peer {
  userId: string;
  pc: RTCPeerConnection;
  dc?: RTCDataChannel;
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

interface ChatViewProps {}

const ChatView: React.FC<ChatViewProps> = ({}) => {
  const [message, setMessage] = React.useState("");

  const sendMessage = () => {
    setMessage("");
  };

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
  const [peers, setPeers] = React.useState<Peer[]>([]);
  const [chat, setChat] = React.useState<string | null>(null); // userId

  const [me, setMe] = React.useState<User | null>(null);
  const [users, setUsers] = React.useState<User[]>([]);

  const addUser = (user: User) => {
    setUsers([...users, user]);
  };

  const removeUser = (userId: string) => {
    setUsers(users.filter((user) => user.id !== userId));
  };

  const openChat = (user: User) => {
    let pc = new RTCPeerConnection();

    pc.ondatachannel = (e) => {
      let dc = e.channel;
      dc.onopen = () => console.log("Connection is open!");
      dc.onmessage = (e) => console.log("Received a message: " + e.data);
      setPeers(
        peers.filter((peer) =>
          peer.userId !== user.id ? peer : { userId: user.id, pc: pc, dc: dc }
        )
      );
    };

    pc.addEventListener("icecandidate", (e) => {
      console.log("New ice candidate");
      socket?.send(
        JSON.stringify({
          type: "candidate",
          data: {
            from: me?.id,
            to: user.id,
            description: pc.localDescription,
            socket: false,
          },
        })
      );
    });

    let dc = pc.createDataChannel(user.id);

    dc.onopen = (e) => console.log("Connection is open!");
    dc.onmessage = (e) => console.log("Received message: ", e.data);

    pc.createOffer()
      .then((offer) => pc.setLocalDescription(offer))
      .then(() => console.log("Offer created & set as local description."));

    setPeers([...peers, { userId: user.id, pc, dc }]);
  };

  React.useEffect(() => {
    if (socket || !username) return;

    const connection = new WebSocket(WEBSOCKET_URL + username);
    setSocket(connection);

    connection.onmessage = (e) => {
      var { type, data } = JSON.parse(e.data);

      switch (type) {
        case "candidate":
          if (data.description.type === "offer") {
            console.log("Received an offer!");
            console.log(peers);
            var pc = new RTCPeerConnection();

            pc.ondatachannel = (e) => {
              let dc = e.channel;

              dc.onopen = () => console.log("Connection is open!");
              dc.onmessage = (e) =>
                console.log("Received a message: " + e.data);

              setPeers(
                peers.filter((peer) =>
                  peer.userId !== data.from
                    ? peer
                    : { userId: data.from, pc: pc, dc: dc }
                )
              );
            };

            pc.addEventListener("icecandidate", (e) => {
              // data.from is being lost but is necessary
              console.log("New ice candidate!");

              var from = new String(data.from);
              console.log("From = ", from);

              console.log(
                JSON.stringify({
                  type: "candidate",
                  data: {
                    from: me?.id,
                    to: from,
                    description: pc.localDescription,
                    socket: true,
                  },
                })
              );

              connection?.send(
                JSON.stringify({
                  type: "candidate",
                  data: {
                    from: me?.id,
                    to: from,
                    description: pc.localDescription,
                    socket: true,
                  },
                })
              );
            });

            setPeers([...peers, { userId: data.from, pc }]);

            pc.setRemoteDescription(data.description).then(() =>
              console.log("Offer set!")
            );
            pc.createAnswer()
              .then((answer) => pc.setLocalDescription(answer))
              .then(() => console.log("Answer created!"));
          } else if (data.description.type === "answer") {
            console.log("Received an answer!");
            console.log("From = ", data.from);
            for (let i = 0; i < peers.length; i++) {
              if (peers[i].userId === data.from) {
                peers[i].pc.setRemoteDescription(data.description);
                console.log("Answer has been set!");
              }
            }
          }
          break;
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
        default:
          break;
      }
    };

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
            {/* favorites */}
            <div className="flex flex-col items-center gap-2 py-2 border-b border-base-300">
              fav
            </div>
            {/* all */}
            <div className="flex flex-col items-center gap-2 py-2">
              {users
                .filter((user) => user.id !== me.id)
                .map((user) => (
                  <div
                    key={user.id}
                    className="cursor-pointer"
                    onClick={() => openChat(user)}
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
        {/* ChatData area */}
        <div className="grow flex flex-col items-center justify-center border-r border-base-300">
          {chat ? <ChatView /> : <span>Click on a user to open a chat</span>}
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
