import { Howl } from "howler";

type Track = "invite" | "message";

export const notification = (track: Track) => {
  const sound = new Howl({
    src: [track === "invite" ? "/invite.mp3" : "/message.mp3"],
  });
  sound.play();
};
