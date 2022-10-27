import React from "react";

interface LoginViewProps {
  setUsername: (username: string) => void;
}

const LoginView: React.FC<LoginViewProps> = ({ setUsername }) => {
  const usernameRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className="min-h-screen w-full flex flex-col gap-4 xs:gap-8 items-center justify-center bg-base-300 text-xs xs:text-base">
      <h1 className="text-lg xs:text-2xl">
        Welcome to <span className="text-highlight">Loquor</span>
      </h1>
      <p className="text-center">
        A platform where you can chat
        <span className="text-highlight">&nbsp;directly&nbsp;</span>
        with others.
      </p>
      <div className="flex flex-col gap-2 xs:gap-4 p-2 py-4 xs:p-8 border bg-base-100 rounded">
        <input
          placeholder="Username"
          ref={usernameRef}
          maxLength={32}
          minLength={1}
          onKeyUp={(e) =>
            e.key === "Enter" && setUsername(usernameRef.current!.value)
          }
          className="input input-primary input-bordered input-sm xs:input-md"
          type="text"
        />
        <button
          className="btn btn-primary btn-sm xs:btn-md"
          onClick={() => setUsername(usernameRef.current!.value)}
        >
          Enter
        </button>
      </div>
    </div>
  );
};

export default LoginView;
