import { useAutoAnimate } from "@formkit/auto-animate/react";
import cuid from "cuid";
import React from "react";
import { toast } from "react-hot-toast";
import { HiUserAdd } from "react-icons/hi";
import { SiGooglechat } from "react-icons/si";
import ChatView from "./ChatView";
import Layout from "./Layout";
import PeerView from "./PeerView";
import { DCEventData, EventData, Message, Peer, User } from "./types";
import UsersView from "./UsersView";
import { notification } from "./utils";

interface HomeViewProps {
  me: User;
  socket: WebSocket;
}

const HomeView: React.FC<HomeViewProps> = ({ me, socket }) => {
  const [users, setUsers] = React.useState<User[]>([]);
  const [peers, setPeers] = React.useState(new Map<string, Peer>());
  const [invitedUsers, setInvitedUsers] = React.useState<User[]>([]);
  const [chatInvites, setChatInvites] = React.useState<User[]>([]);
  const [messages, setMessages] = React.useState<Message[]>([]);
  // UI related
  const [openChat, setOpenChat] = React.useState<User | null>(null);
  const openChatState = React.useRef<User | null>();
  openChatState.current = openChat;
  const [viewInvite, setViewInvite] = React.useState<User | null>(null);
  const viewInviteRef = React.useRef<User | null>();
  viewInviteRef.current = viewInvite;
  const [parent] = useAutoAnimate<HTMLDivElement>();

  React.useEffect(() => {
    // user related events
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
          removePeer(data.id);
          setChatInvites((users) =>
            users.filter((user) => user.id !== data.id)
          );
          setUsers((users) => users.filter((user) => user.id !== data.id));
          if (viewInviteRef.current?.id === data.id) {
            setViewInvite(null);
          }
          break;
        case "chatInvite":
          notification("invite");
          setChatInvites((chatInvites) => [...chatInvites, data.user]);
          break;
        case "chatInviteCancel":
          setChatInvites((chatInvites) =>
            chatInvites.filter((c) => c.id !== data.user.id)
          );
          setViewInvite(null);
          break;
        default:
          break;
      }
    });
    socket.send(JSON.stringify({ type: "getUsers", data: {} }));
  }, []);

  React.useEffect(() => {
    // WebRTC related events
    socket.addEventListener("message", (e) => {
      const { type, data }: EventData = JSON.parse(e.data);
      let peer: Peer | undefined;

      switch (type) {
        case "chatInviteRes":
          if (data.response === true) {
            let peer = peers.get(data.from.id);
            if (!peer) return;

            toast(`${data.from.username} accepted your chat invite 🤝🏼`);

            peer.pc
              .createOffer()
              .then((offer) => peer?.pc.setLocalDescription(offer))
              .then(() => {
                socket.send(
                  JSON.stringify({
                    type: "offer",
                    data: {
                      from: me.id,
                      target: data.from.id,
                      description: peer?.pc.localDescription,
                    },
                  })
                );
              })
              .catch((error) =>
                console.log("error while creating offer ", error)
              );
            setInvitedUsers((users) =>
              users.filter((user) => user.id !== data.from.id)
            );
          } else {
            toast(`${data.from.username} rejected your chat invite 😐️`);
            removePeer(data.from.id);
            setInvitedUsers((users) =>
              users.filter((user) => user.id !== data.from.id)
            );
          }
          break;
        case "ice-candidate":
          peer = peers.get(data.from);
          if (!peer) return;

          peer.pc.addIceCandidate(data.candidate);
          break;
        case "offer":
          peer = peers.get(data.from);
          if (!peer) return;

          peer.pc
            .setRemoteDescription(new RTCSessionDescription(data.description))
            .catch((error) =>
              console.log("Caught an error while setting: offer", error)
            );
          peer.pc
            .createAnswer()
            .then((answer) => peer?.pc.setLocalDescription(answer))
            .then(() =>
              socket.send(
                JSON.stringify({
                  type: "answer",
                  data: {
                    from: me.id,
                    target: data.from,
                    description: peer?.pc.localDescription,
                  },
                })
              )
            )
            .catch((error) =>
              console.log("Caught an error while creating an answer", error)
            );
          break;
        case "answer":
          peer = peers.get(data.from);
          if (!peer) return;

          peer.pc
            .setRemoteDescription(new RTCSessionDescription(data.description))
            .catch((error) =>
              console.log("Caught an error while setting: answer", error)
            );
          break;
        default:
          break;
      }
    });
  }, [peers]);

  React.useEffect(() => {
    const pathname = window.location.pathname;
    const paths = pathname.split("/");

    if (pathname.includes("invite") && paths.length === 4) {
      const user = { id: paths[2], username: paths[3] };
      sendInvite(user);
      window.history.replaceState({}, document.title, window.location.origin);
    }
  }, []);

  const handleOnIceCandidate = (
    { candidate }: RTCPeerConnectionIceEvent,
    target: string
  ) => {
    if (!candidate) return;

    socket.send(
      JSON.stringify({
        type: "ice-candidate",
        data: {
          from: me.id,
          target: target,
          candidate: candidate,
        },
      })
    );
  };

  const handleDataChannelOnOpen = () => {
    if (openChat) {
      setMessages((messages) =>
        messages.map((m) =>
          m.author.id !== openChat.id ? m : { ...m, read: true }
        )
      );
    }
    setPeers(new Map(peers));
  };

  const handleDataChannelOnMessage = (e: MessageEvent) => {
    const { type, data }: DCEventData = JSON.parse(e.data);
    if (type === "message") {
      let isInChat = openChatState.current?.id === data.message.author.id;
      setMessages((messages) => [
        ...messages,
        { ...data.message, read: isInChat },
      ]);
      if (!isInChat) notification("message");
    }
  };

  const handleDataChannelOnClose = (user: User) => {
    removePeer(user.id);
    toast(`Chat with ${user.username} has ended 👋🏼`);
  };

  const createPeer = (user: User, host: boolean) => {
    let peer: Peer = {
      pc: new RTCPeerConnection({
        iceServers: [
          {
            urls: "stun:openrelay.metered.ca:80",
          },
          {
            urls: "turn:openrelay.metered.ca:80",
            username: "openrelayproject",
            credential: "openrelayproject",
          },
          {
            urls: "turn:openrelay.metered.ca:443",
            username: "openrelayproject",
            credential: "openrelayproject",
          },
        ],
        iceTransportPolicy: "all",
      }),
      host,
      user,
      dc: undefined,
    };

    peer.pc.onicecandidate = (e) => handleOnIceCandidate(e, user.id);

    if (host) {
      peer.dc = peer.pc.createDataChannel(cuid());

      peer.dc.onopen = handleDataChannelOnOpen;
      peer.dc.onmessage = handleDataChannelOnMessage;
      peer.dc.onclose = () => handleDataChannelOnClose(user);
    } else {
      peer.pc.ondatachannel = (e) => {
        peer.dc = e.channel;

        peer.dc.onopen = handleDataChannelOnOpen;
        peer.dc.onmessage = handleDataChannelOnMessage;
        peer.dc.onclose = () => handleDataChannelOnClose(user);
      };
    }

    peers.set(user.id, peer);
  };

  const removePeer = (userID: string) => {
    let peer = peers.get(userID);
    if (!peer) return;

    if (openChat?.id === userID) {
      setOpenChat(null);
    }

    peer.dc?.close();
    peer.dc = undefined;
    peer.pc.onicecandidate = null;
    peers.delete(userID);

    setMessages((messages) =>
      messages.filter((m) => m.author.id !== userID && m.target.id !== userID)
    );
  };

  const sendInvite = (user: User) => {
    if (invitedUsers.includes(user)) return;

    let invited = false;
    chatInvites.forEach((u) => {
      if (u.id === user.id) {
        toast(`${user.username} has invited you already`);
        invited = true;
      }
    });
    if (invited) return;

    createPeer(user, true);
    socket.send(
      JSON.stringify({
        type: "chatInvite",
        data: {
          target: user.id,
          from: me,
        },
      })
    );
    setInvitedUsers((users) => [...users, user]);
  };

  const cancelInvite = (user: User) => {
    if (!invitedUsers.includes(user)) return;

    socket.send(
      JSON.stringify({
        type: "chatInviteCancel",
        data: {
          target: user.id,
          from: me,
        },
      })
    );

    setInvitedUsers((users) => users.filter((u) => u.id !== user.id));
  };

  const handleInvite = (user: User, response: boolean) => {
    if (response) createPeer(user, false);

    socket.send(
      JSON.stringify({
        type: "chatInviteRes",
        data: {
          from: me,
          target: user.id,
          response,
        },
      })
    );

    setChatInvites((invites) => invites.filter((u) => u.id !== user.id));
    setViewInvite(null);
  };

  return (
    <>
      {/* modals */}
      <input type="checkbox" id="handleInvite" className="modal-toggle" />

      {viewInvite && (
        <label
          htmlFor="handleInvite"
          className="modal bg-base-300 bg-opacity-60"
        >
          <label
            className="modal-box flex flex-col items-center gap-8"
            htmlFor=""
          >
            <p className="text-lg text-center">
              <span className="font-bold">{viewInvite.username}</span> sent you
              a chat invitation!
            </p>
            <div className="flex flex-row items-center gap-8">
              <button
                className=""
                onClick={() => handleInvite(viewInvite, false)}
              >
                Reject
              </button>
              <button
                className="btn btn-primary"
                onClick={() => handleInvite(viewInvite, true)}
              >
                Accept
              </button>
            </div>
          </label>
        </label>
      )}

      <Layout user={me}>
        <div className="flex-grow flex flex-col sm:flex-row overflow-y-auto min-h-0">
          {/* chats */}
          <div className="w-full sm:max-w-[100px] min-h-16 sm:h-full flex flex-row sm:flex-col items-center sm:py-4 border-y bg-base-200 border-2 sm:border-r gap-2 sm:gap-5">
            <div className="w-fit px-4 h-16 flex flex-col items-center justify-center">
              <SiGooglechat size={32} className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            {/* chat invites */}
            <div
              ref={parent}
              className="w-full h-full flex flex-row sm:flex-col items-center gap-4 overflow-x-auto overflow-y-hidden p-2 sm:overflow-y-auto sm:overflow-x-hidden"
            >
              {chatInvites.map((u) => (
                <label
                  key={u.id}
                  className="relative min-w-fit min-h-fit cursor-pointer bg-base-100 border p-2 rounded"
                  htmlFor="handleInvite"
                  onClick={() => setViewInvite(u)}
                >
                  <span className="z-50 absolute -top-0.5 -right-0.5 badge rounded-full px-[2px] py-[4px] flex items-center justify-center">
                    <HiUserAdd size={16} />
                  </span>
                  <img
                    className="rounded w-8 h-8 sm:w-12 sm:h-12"
                    src={`https://ui-avatars.com/api/?name=${u.username}`}
                    alt={u.username}
                  />
                </label>
              ))}
              {/* open chats */}
              {Array.from(peers).map(
                ([k, v]) =>
                  v.dc?.readyState === "open" &&
                  k !== openChat?.id && (
                    <PeerView
                      key={k}
                      messages={messages}
                      openChat={openChat}
                      setOpenChat={setOpenChat}
                      setMessages={setMessages}
                      peer={v}
                    />
                  )
              )}
            </div>
          </div>
          {openChat && peers.get(openChat.id)?.dc?.readyState === "open" ? (
            <ChatView
              me={me}
              user={openChat}
              messages={messages}
              removePeer={removePeer}
              setMessages={setMessages}
              setOpenChat={setOpenChat}
              dc={peers.get(openChat.id)?.dc!}
            />
          ) : (
            <UsersView
              users={users.filter(
                (user) =>
                  user.id !== me.id &&
                  !(peers.get(user.id)?.dc?.readyState === "open")
              )}
              invitedUsers={invitedUsers}
              sendInvite={sendInvite}
              cancelInvite={cancelInvite}
            />
          )}
        </div>
      </Layout>
    </>
  );
};

export default HomeView;
