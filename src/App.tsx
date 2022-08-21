import React from "react";
import { MdKeyboardArrowRight } from "react-icons/md";

const App: React.FC = () => {
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
            src={`https://ui-avatars.com/api/?name=${"Jacob"}`}
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
            <div className="flex flex-col items-center gap-2 py-2">all</div>
          </div>
        </div>
        {/* chat area */}
        <div className="grow flex flex-col items-center justify-center border-r border-base-300">
          so empty..
        </div>
      </div>
    </div>
  );
};

// const WEBSOCKET_URL = "ws://0.0.0.0:8000/";

// const App: React.FC = () => {
//   const [id, setId] = React.useState(Math.random().toString());
//   const [socket, setSocket] = React.useState<WebSocket | undefined>();
//   const [pc, setPc] = React.useState(new RTCPeerConnection());
//   const [dc, setDc] = React.useState<RTCDataChannel>();

//   const [message, setMessage] = React.useState("");

//   React.useEffect(() => {
//     if (socket) return;

//     const connection = new WebSocket(WEBSOCKET_URL);

//     connection.onmessage = (e) => {
//       const { userId, data }: { userId: string; data: RTCSessionDescription } =
//         JSON.parse(e.data);

//       if (userId === id || (pc.remoteDescription && pc.localDescription))
//         return;
//       if (data.type === "offer") {
//         pc.setRemoteDescription(data).then(() => console.log("Offer set!"));
//         pc.createAnswer()
//           .then((answer) => pc.setLocalDescription(answer))
//           .then(() => console.log("Answer created!"));
//       } else if (data.type === "answer") {
//         pc.setRemoteDescription(data);
//       }
//     };

//     setSocket(connection);
//     return () => connection?.close();
//   }, []);

//   pc.onicecandidate = () => {
//     console.log("New ice candidate: ");
//     console.log(pc.localDescription);
//     socket?.send(
//       JSON.stringify({
//         userId: id,
//         data: pc.localDescription,
//       })
//     );
//   };

//   pc.ondatachannel = (e) => {
//     let dataChannel = e.channel;
//     dataChannel.onopen = () => console.log("Connection is open!");
//     dataChannel.onmessage = (e) => console.log("Received a message: " + e.data);
//     setDc(dataChannel);
//   };

//   const createDataChannel = () => {
//     const dc = pc.createDataChannel("channel");
//     dc.onopen = () => console.log("Connection is open!");
//     dc.onmessage = (e) => console.log("Received a message: " + e.data);

//     pc.createOffer()
//       .then((offer) => pc.setLocalDescription(offer))
//       .then(() => console.log("Offer created & set as local description."));

//     setDc(dc);
//   };

//   return (
//     <div className="">
//       <h1>Loquor - A peer to peer web chat application</h1>
//       <button onClick={() => createDataChannel()}>Create channel</button>
//       <input
//         className="input input-bordered"
//         type="text"
//         onChange={(e) => setMessage(e.currentTarget.value)}
//       />
//       <button onClick={() => dc?.send(message)}>Send message</button>
//     </div>
//   );
// };

export default App;
