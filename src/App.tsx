import React from "react";
import { MdKeyboardArrowRight } from "react-icons/md";
import create from "zustand";

interface User {
  id: string;
  username: string;
}

interface State {
  me: User | undefined;
  users: User[];
  setMe: (user: User) => void;
  addUser: (user: User) => void;
  removeUser: (id: String) => void;
  setUsers: (users: User[]) => void;
}

const useStore = create<State>((set) => ({
  users: [],
  me: undefined,
  setMe: (user) => set(() => ({ me: user })),
  addUser: (user) => set((state) => ({ users: [...state.users, user] })),
  removeUser: (id: string) =>
    set((state) => ({ users: state.users.filter((user) => user.id !== id) })),
  setUsers: (users) => set(() => ({ users: users })),
}));

const WEBSOCKET_URL = "ws://0.0.0.0:8000/";

const App: React.FC = () => {
  const [username, setUsername] = React.useState<string | null>(null);
  const [chatId, setChatId] = React.useState<string | null>(null); // userId
  const [chats, setChats] = React.useState<string[]>([]); // userIds
  const [socket, setSocket] = React.useState<WebSocket | undefined>();
  const [message, setMessage] = React.useState("");

  const usernameRef = React.useRef<HTMLInputElement>(null);

  const users = useStore((state) => state.users);
  const me = useStore((state) => state.me);
  const setMe = useStore((state) => state.setMe);
  const addUser = useStore((state) => state.addUser);
  const removeUser = useStore((state) => state.removeUser);
  const setUsers = useStore((state) => state.setUsers);

  React.useEffect(() => {
    if (socket || !username) return;

    const connection = new WebSocket(WEBSOCKET_URL + username);
    setSocket(connection);

    connection.onmessage = (e) => {
      const { type, data } = JSON.parse(e.data);
      console.log(data);
      switch (type) {
        case "candidate":
          if (data.description.type === "offer") {
            peerConnection
              .setRemoteDescription(data.description)
              .then(() => console.log("Offer set!"));
            peerConnection
              .createAnswer()
              .then((answer) => peerConnection.setLocalDescription(answer))
              .then(() => console.log("Answer created!"));
            setChats([...chats, data.from]);
          } else if (data.description.type === "answer") {
            console.log("answer received");
            peerConnection.setRemoteDescription(data.description);
          }
          break;
        case "setMe":
          setMe(data);
          break;
        case "addUser":
          addUser(data);
          break;
        case "removeUser":
          removeUser(data);
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

  const [peerConnection, setPeerConnection] = React.useState(
    new RTCPeerConnection()
  );
  const [dataChannel, setDataChannel] = React.useState<RTCDataChannel | null>(
    null
  );

  peerConnection.onicecandidate = () => {
    console.log("New ice candidate: ");
    console.log(peerConnection.localDescription);

    console.log(chats);

    socket?.send(
      JSON.stringify({
        type: "candidate",
        data: {
          from: me.id,
          to:
            peerConnection.localDescription.type === "offer"
              ? chatId
              : chats[chats.length - 1],
          description: peerConnection.localDescription,
        },
      })
    );
  };

  // handle new data channel
  peerConnection.ondatachannel = (e) => {
    let dataChannel = e.channel;
    dataChannel.onopen = () => console.log("Connection is open!");
    dataChannel.onmessage = (e) => {
      console.log(e);
      console.log("Received a message: " + e.data);
    };
    setDataChannel(dataChannel);
  };

  const createDataChannel = (chatId: string) => {
    let dc = peerConnection.createDataChannel(chatId);

    dc.onopen = () => console.log("Connection is open!");
    dc.onmessage = (e) => console.log("Received a message: " + e.data);

    peerConnection
      .createOffer()
      .then((offer) => peerConnection.setLocalDescription(offer))
      .then(() => console.log("Offer created & set as local description."));

    setDataChannel(dc);
  };

  const openChat = (userId: string) => {
    setChatId(userId);
    createDataChannel(userId);
  };

  const sendMessage = () => {
    dataChannel.send(message);
    setMessage("");
  };

  if (!username) {
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
            onClick={() => setUsername(usernameRef.current.value)}
          >
            Enter
          </button>
        </div>
      </div>
    );
  }

  if (typeof me === "undefined") {
    return <span>loading</span>;
  }

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
        <h1>A peer to peer chat application.</h1>
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
                .filter((user) => user.username !== me.username)
                .map((user) => (
                  <div
                    key={user.id}
                    className="cursor-pointer"
                    onClick={() => openChat(user.id)}
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
        {/* chat area */}
        <div className="grow flex flex-col items-center justify-center border-r border-base-300">
          {chatId && (
            <div>
              <span>chatting with {chatId}</span>
              <input
                value={message}
                onChange={(e) => setMessage(e.currentTarget.value)}
                className="input input-bordered"
              />
              <button className="btn" onClick={() => sendMessage()}>
                Send
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
