import ReactDOM from "react-dom/client";
import { Toaster } from "react-hot-toast";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <>
    <App />
    <Toaster position="top-center" toastOptions={{
      className: "bg-base-100 text-primary"
    }} />
  </>
);
