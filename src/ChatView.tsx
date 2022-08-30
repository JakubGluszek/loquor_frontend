import React from "react";
import cuid from "cuid";
import { formatDistance } from "date-fns";
import { MdClose, MdOutlineExitToApp } from "react-icons/md";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { User, Message } from "./types";

interface ChatMessageProps {
  message: Message;
  me: User;
}

const handleWord = (word: string, index: number): string | React.ReactNode => {
  if (word.includes("http") && word.startsWith("http"))
    return (
      <>
        {index > 0 && <>&nbsp;</>}
        <a href={word} className="link link-primary" target="_blank">
          {word}
        </a>
      </>
    );
  return (
    <>
      {index > 0 && <>&nbsp;</>}
      {word}
    </>
  );
};

const ChatMessage: React.FC<ChatMessageProps> = ({ message, me }) => {
  return (
    <div className="flex flex-row gap-2 p-1 sm:p-2 border-b bg-base-300 hover:bg-base-200">
      <img
        className="rounded w-6 h-6 sm:w-8 sm:h-8"
        src={`https://ui-avatars.com/api/?name=${message.author.username}`}
        alt={message.author.username}
      />
      <div className="flex flex-col gap-2">
        <div className="flex flex-row items-center gap-4 font-ubuntu">
          <span
            className={`text-base xs:text-lg font-bold ${
              message.author.id === me.id ? "text-primary" : "text-accent"
            }`}
          >
            {message.author.username}
          </span>
          <span className="text-xs xs:text-sm opacity-60">
            {formatDistance(new Date(), new Date(message.timestamp), {
              includeSeconds: true,
            })}{" "}
            ago
          </span>
        </div>
        <p className="font-mono">
          {message.body.split(" ").map((word, i) => (
            <span key={i}>{handleWord(word, i)}</span>
          ))}
        </p>
      </div>
    </div>
  );
};

interface ChatViewProps {
  me: User;
  user: User;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setOpenChat: (user: User | null) => void;
  dc: RTCDataChannel;
  removePeer: (userID: string) => void;
}

const ChatView: React.FC<ChatViewProps> = ({
  me,
  user,
  messages,
  dc,
  removePeer,
  setOpenChat,
  setMessages,
}) => {
  const [body, setBody] = React.useState("");
  const [isTyping, setIsTyping] = React.useState(false);
  const [container] = useAutoAnimate<HTMLDivElement>();

  React.useEffect(() => {
    dc.addEventListener("message", (e) => {
      const { type, data } = JSON.parse(e.data);
      if (type === "isTyping") {
        // data: {author: User, isTyping: boolean}
        setIsTyping(data.isTyping);
      } else if (type === "message") {
        setIsTyping(false);
      }
    });
  }, []);

  React.useEffect(() => {
    container.current?.scrollTo({ top: container.current.scrollHeight });
  }, [messages]);

  const sendMessage = () => {
    if (body.length === 0) return;

    const message = {
      id: cuid(),
      author: me,
      target: user,
      body,
      timestamp: new Date(),
    };

    dc.send(JSON.stringify({ type: "message", data: message }));
    setMessages((messages) => [...messages, message]);
    setBody("");
  };

  const handleIsTypingEvent = (isTyping: boolean) =>
    dc.send(
      JSON.stringify({
        type: "isTyping",
        data: {
          isTyping,
          author: me,
        },
      })
    );

  return (
    <div className="flex-grow flex flex-col overflow-y-hidden min-h-0 overflow-x-hidden text-xs xs:text-base">
      {/* current chat header */}
      <div className="min-h-20 flex flex-row items-center flex-wrap gap-4 p-2 bg-base-300 border-b animate-in slide-in-from-top-16 duration-300">
        <img
          className="rounded w-8 h-8 sm:w-10 sm:h-10"
          src={`https://ui-avatars.com/api/?name=${user.username}`}
          alt={user.username}
        />
        <span className="text-sm xs:text-lg sm:text-2xl font-bold text-accent">
          {user.username}
        </span>
        <div className="xs:ml-auto flex-grow xs:flex-grow-0 flex flex-row flex-row-wrap xs:flex-nowrap items-center gap-2">
          <button
            className="flex-grow xs:flex-grow-0 btn btn-ghost btn-sm sm:btn-md xs:tooltip xs:tooltip-left xs:tooltip-primary"
            data-tip="Minimize chat"
            onClick={() => {
              setMessages((messages) =>
                messages.map((m) =>
                  m.author.id !== user.id ? m : { ...m, read: true }
                )
              );
              setOpenChat(null);
            }}
          >
            <MdClose size={24} />
          </button>
          <button
            className="flex-grow xs:flex-grow-0 btn btn-ghost btn-sm sm:btn-md xs:tooltip xs:tooltip-left xs:tooltip-primary"
            onClick={() => removePeer(user.id)}
            data-tip="End chat"
          >
            <MdOutlineExitToApp size={24} />
          </button>
        </div>
      </div>
      <div
        ref={container}
        className="mb-[105px] xs:mb-[64px] sm:mb-[0px] flex-grow flex flex-col overflow-y-auto min-h-0 overflow-x-hidden"
      >
        {messages
          .filter((m) => m.author.id === user.id || m.target.id === user.id)
          .map((m) => (
            <ChatMessage key={m.id} message={m} me={me} />
          ))}
      </div>
      <div className="fixed bottom-0 w-full sm:static h-fit flex flex-row flex-wrap xs:flex-nowrap items-center gap-2 sm:gap-4 p-4 border-t animate-in slide-in-from-bottom-16 duration-300">
        <input
          value={body}
          type="text"
          className="flex-grow input input-bordered input-sm sm:input-md bg-base-300"
          placeholder={
            isTyping
              ? `${user.username} is typing...`
              : `Send a message to ${user.username}`
          }
          onKeyUp={(e) => e.key === "Enter" && sendMessage()}
          onChange={(e) => {
            if (e.currentTarget.value.length > 1) handleIsTypingEvent(true);
            else if (body.length > 0 && e.currentTarget.value.length === 0)
              handleIsTypingEvent(false);
            setBody(e.currentTarget.value);
          }}
        />
        <button
          className="btn btn-primary btn-sm flex-grow xs:flex-grow-0 sm:btn-md sm:w-28"
          onClick={() => sendMessage()}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatView;
