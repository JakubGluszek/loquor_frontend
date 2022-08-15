import React from "react";

const WEBSOCKET_URL = "ws://0.0.0.0:8000/";

const App: React.FC = () => {
  const [id, setId] = React.useState(Math.random().toString());
  const [socket, setSocket] = React.useState<WebSocket | undefined>();
  const [pc, setPc] = React.useState(new RTCPeerConnection());
  const [dc, setDc] = React.useState<RTCDataChannel>();

  const [message, setMessage] = React.useState("");

  React.useEffect(() => {
    if (socket) return;

    const connection = new WebSocket(WEBSOCKET_URL);

    connection.onmessage = (e) => {
      const { userId, data }: { userId: string; data: RTCSessionDescription } =
        JSON.parse(e.data);

      if (userId === id || (pc.remoteDescription && pc.localDescription))
        return;
      if (data.type === "offer") {
        pc.setRemoteDescription(data).then(() => console.log("Offer set!"));
        pc.createAnswer()
          .then((answer) => pc.setLocalDescription(answer))
          .then(() => console.log("Answer created!"));
      } else if (data.type === "answer") {
        pc.setRemoteDescription(data);
      }
    };

    setSocket(connection);
    return () => connection?.close();
  }, []);

  pc.onicecandidate = () => {
    console.log("New ice candidate: ");
    console.log(pc.localDescription);
    socket?.send(
      JSON.stringify({
        userId: id,
        data: pc.localDescription,
      })
    );
  };

  pc.ondatachannel = (e) => {
    let dataChannel = e.channel;
    dataChannel.onopen = () => console.log("Connection is open!");
    dataChannel.onmessage = (e) => console.log("Received a message: " + e.data);
    setDc(dataChannel);
  };

  const createDataChannel = () => {
    const dc = pc.createDataChannel("channel");

    dc.onopen = () => console.log("Connection is open!");
    dc.onmessage = (e) => console.log("Received a message: " + e.data);

    pc.createOffer()
      .then((offer) => pc.setLocalDescription(offer))
      .then(() => console.log("Offer created & set as local description."));

    setDc(dc);
  };

  return (
    <div className="">
      <h1>Loquor - A peer to peer web chat application</h1>
      <button onClick={() => createDataChannel()}>Create channel</button>
      <input
        className="input input-bordered"
        type="text"
        onChange={(e) => setMessage(e.currentTarget.value)}
      />
      <button onClick={() => dc?.send(message)}>Send message</button>
    </div>
  );
};

export default App;
