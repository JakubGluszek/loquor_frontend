export interface User {
  id: string;
  username: string;
}

export interface ChatInvite {
  user: User;
}

export interface Message {
  id: string;
  author: User;
  target: User;
  body: string;
  read?: boolean;
  timestamp: Date;
}

export interface Peer {
  pc: RTCPeerConnection;
  user: User;
  host: boolean;
  dc?: RTCDataChannel;
}

export type Sort = "asc" | "desc";

export interface EventUser {
  type: "me" | "setUser" | "addUser" | "removeUser";
  data: User;
}

export interface EventSetUsers {
  type: "setUsers";
  data: User[];
}

export interface EventChatInvite {
  type: "chatInvite" | "chatInviteCancel";
  data: ChatInvite;
}

export interface EventChatRes {
  type: "chatInviteRes";
  data: {
    from: User;
    target: string; // User.id
    response: boolean;
  };
}

export interface EventIceCandidate {
  type: "ice-candidate";
  data: {
    from: string; // me.id
    target: string; // openChat.id
    candidate: RTCIceCandidateInit;
  };
}

export interface EventSDPDescription {
  type: "offer" | "answer";
  data: {
    from: string; // me.id
    target: string; // openChat.id
    description: RTCSessionDescriptionInit;
  };
}

export type EventData =
  | EventUser
  | EventSetUsers
  | EventChatInvite
  | EventChatRes
  | EventIceCandidate
  | EventSDPDescription;

export interface DCEventMessage {
  type: "message";
  data: {
    message: Message;
  };
}

export interface DCEventIsTyping {
  type: "isTyping";
  data: {
    isTyping: boolean;
  };
}

export type DCEventData = DCEventMessage | DCEventIsTyping;
