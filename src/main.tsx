import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

declare global {
  interface Window {
    __OCE_BOOTED__?: boolean;
    __OCE_JS_RAN__?: boolean;
  }
}

// First executable line: proves the bundle loaded and began executing.
window.__OCE_JS_RAN__ = true;

try {
  ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
  window.__OCE_BOOTED__ = true;
} catch (e) {
  // The inline fail-safe in index.html listens for errors; rethrow so it fires.
  window.dispatchEvent(
    new ErrorEvent("error", {
      message: e instanceof Error ? e.message : String(e),
      error: e instanceof Error ? e : undefined,
    })
  );
}
