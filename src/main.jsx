import React from "react";
import ReactDOM from "react-dom/client";
import Auth from "./Auth";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Auth>
      <App />
    </Auth>
  </React.StrictMode>
);
