import React from "react";
import { toast } from "react-hot-toast";
import { User, EventData } from "./types";

const WEBSOCKET_URL = import.meta.env.VITE_WS_SERVER;

interface useSocketServerArgs {
  username: string | null;
  setMe: (me: User) => void;
}

const useSocketServer = ({ username, setMe }: useSocketServerArgs) => {
  const [socket, setSocket] = React.useState<WebSocket | null>(null);

  React.useEffect(() => {
    if (socket || !username) return;

    const socketServer = new WebSocket(WEBSOCKET_URL + username);
    setSocket(socketServer);

    socketServer.addEventListener("message", (e) => {
      const { type, data }: EventData = JSON.parse(e.data);

      if (type === "me") {
        setMe(data);
        toast(
          `${
            ["Yo", "Welcome", "Wosop", "Hi", "Hello"][
              Math.floor(Math.random() * 5)
            ]
          }, ${data.username} ✌🏼`
        );
      }
    });

    return () => socketServer.close();
  }, [username]);

  return socket;
};

export default useSocketServer;
