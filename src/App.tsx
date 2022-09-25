import React from "react";
import useSocketServer from "./useSocketServer";
import LoginView from "./LoginView";
import HomeView from "./HomeView";
import { User } from "./types";
import { Loader } from "@mantine/core";
import Layout from "./Layout";

const App: React.FC = () => {
  const [username, setUsername] = React.useState<string | null>(null);
  const [me, setMe] = React.useState<User>();
   
  const socket = useSocketServer({ username, setMe });

  if (!username) {
    return <LoginView setUsername={setUsername} />;
  }

  if (!me || !socket)
    return (
      <Layout user={me}>
        <div className="flex-grow flex flex-col items-center justify-center">
          <Loader size={"xl"} variant="oval" color="green" />
        </div>
      </Layout>
    );

  return <HomeView me={me} socket={socket} />;
};

export default App;
