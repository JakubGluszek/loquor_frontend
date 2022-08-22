import React from "react";
import { MdKeyboardArrowRight } from "react-icons/md";

interface User {
  id: string;
  username: string;
}

interface ChatData {
  user: User;
  dataChannel?: RTCDataChannel;
}

interface Peer {
  userId: string;
  rtc: RTCPeerConnection;
  dc: RTCDataChannel;
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
  data: ChatData;
}

const ChatView: React.FC<ChatViewProps> = ({ data }) => {
  const [message, setMessage] = React.useState("");

  const sendMessage = () => {
    data.dataChannel?.send(message);
    setMessage("");
  };

  return (
    <div>
      <span>ChatData is open</span>
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

  const [me, setMe] = React.useState<User | null>(null);
  const [users, setUsers] = React.useState<User[]>([]);
  const [chat, setChat] = React.useState<ChatData | null>(null);

  const addUser = (user: User) => {
    setUsers([...users, user]);
  };

  const removeUser = (userId: string) => {
    setUsers(users.filter((user) => user.id !== userId));
  };

  const handlePeerConnection = (user: User) => {
    // check if peer connection exists with this user
    for (let i = 0; i < peers.length; i++) {
      if (peers[i].userId === user.id) {
        return;
      }
    }

    let rtc = new RTCPeerConnection();
    let peer = {
      userId: user.id,
      rtc: rtc,
      dc: rtc.createDataChannel(user.id),
    };
    setPeers([...peers, peer]);
    console.log("Created a new peer connection.");

    // create an offer
    peer.rtc
      .createOffer()
      .then((offer) => peer?.rtc.setLocalDescription(offer))
      .then(() => console.log("Offer created & set as local description."));

    setChat({ user, dataChannel: peer.dc });
    console.log("Created a new data channel");
    return;
  };

  for (let i = 0; i < peers.length; i++) {
    peers[i].rtc.onicecandidate = (e) => {
      console.log("New ice candidate");

      socket?.send(
        JSON.stringify({
          type: "candidate",
          data: {
            to: peers[i].userId,
            from: me?.id,
            description: peers[i].rtc.localDescription,
          },
        })
      );
    };

    peers[i].dc.onopen = () => console.log("Connection is open!");
    peers[i].dc.onmessage = (e) => console.log("Received a message: " + e.data);

    peers[i].rtc.ondatachannel = (e) => {
      let dc = e.channel;
      dc.onopen = () => console.log("Connection is open!");
      dc.onmessage = (e) => {
        console.log("Received a message: " + e.data);
      };
      setPeers(
        peers.filter((peer) =>
          peer.userId !== peers[i].userId ? peer : { ...peers[i], dc: dc }
        )
      );
    };
  }

  React.useEffect(() => {
    if (socket || !username) return;

    const connection = new WebSocket(WEBSOCKET_URL + username);
    setSocket(connection);

    connection.onmessage = (e) => {
      const { type, data } = JSON.parse(e.data);

      switch (type) {
        case "candidate":
          if (data.description.type === "offer") {
            for (let i = 0; i < peers.length; i++) {
              if (peers[i].userId === data.from) {
                return;
              }
            }
            console.log("Received an Offer");

            let rtc = new RTCPeerConnection();
            let peer = {
              userId: data.from,
              rtc: rtc,
              dc: rtc.createDataChannel(data.from),
            };

            peer.rtc
              .setRemoteDescription(data.description)
              .then(() => console.log("Offer set"));
            peer.rtc
              .createAnswer()
              .then((answer) => peer?.rtc.setLocalDescription(answer))
              .then(() => console.log("Answer created"));

            setPeers([...peers, peer]);
            break;
          } else if (data.description.type === "answer") {
            console.log("Received an Answer");
            for (let i = 0; i < peers.length; i++) {
              if (peers[i].userId === data.from) {
                peers[i].rtc.setRemoteDescription(data.description);
              }
            }
          }
          break;
        case "setMe":
          setMe(data);
          break;
        case "addUser":
          addUser(data);
          break;
        case "removeUser":
          // data = userId
          removeUser(data);
          setPeers(peers.filter((peer) => peer.userId !== data));
          break;
        case "setUsers":
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
        <h1>A peer to peer ChatData application.</h1>
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
                    onClick={() => handlePeerConnection(user)}
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
          {chat ? (
            <ChatView data={chat} />
          ) : (
            <span>Click on a user to ChatData with them</span>
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
