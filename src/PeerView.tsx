import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader } from "@mantine/core";
import { Message, Peer, User } from "./types";

interface PeerViewProps {
  openChat: User | null;
  setOpenChat: (user: User) => void;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  peer: Peer;
}

const PeerView: React.FC<PeerViewProps> = ({
  openChat,
  messages,
  setMessages,
  setOpenChat,
  peer,
}) => {
  const [isTyping, setIsTyping] = React.useState(false);

  React.useEffect(() => {
    peer.dc?.addEventListener("message", (e) => {
      const { type, data } = JSON.parse(e.data);
      if (type === "isTyping") {
        // data: {author: User, isTyping: boolean}
        setIsTyping(data.isTyping);
      } else if (type === "message") {
        setIsTyping(false);
      }
    });
  }, []);

  return (
    <div
      className="z-50 min-w-fit min-h-fit relative cursor-pointer bg-base-100 border p-2 rounded shadow-lg"
      onClick={() => {
        if (openChat) {
          setMessages((messages: Message[]) =>
            messages.map((m) =>
              m.author.id !== openChat.id ? m : { ...m, read: true }
            )
          );
        }
        setOpenChat(peer.user);
        setMessages((messages) =>
          messages.map((m) =>
            m.author.id !== peer.user.id ? m : { ...m, read: true }
          )
        );
      }}
    >
      <AnimatePresence>
        {!isTyping &&
          messages.filter((m) => m.author.id === peer.user.id && !m.read)
            .length > 0 && (
            <motion.span
              className="absolute -top-0.5 -right-0.5 badge badge-primary rounded-full p-1 py-2"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, translateY: 0.6 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              {
                messages.filter((m) => m.author.id === peer.user.id && !m.read)
                  .length
              }
            </motion.span>
          )}
      </AnimatePresence>
      <AnimatePresence>
        {isTyping && (
          <motion.span
            className="absolute -top-1 -right-1 badge badge-primary rounded-full p-0.5 py-3"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, translateY: 0.6 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            <Loader color="dark" variant="dots" size="xs" />
          </motion.span>
        )}
      </AnimatePresence>
      <img
        className="rounded w-8 h-8 sm:w-12 sm:h-12"
        src={`https://ui-avatars.com/api/?name=${peer.user.username}`}
        alt={peer.user.username}
      />
    </div>
  );
};

export default PeerView;
