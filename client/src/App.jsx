import { useState } from "react";
import AdminFlow from "./pages/AdminFlow.jsx";
import JoinFlow from "./pages/JoinFlow.jsx";

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const roomCode = params.get("room");
  const previewMode = params.get("preview") === "1";
  const [manualJoin, setManualJoin] = useState(false);

  if (roomCode) {
    return <JoinFlow initialCode={roomCode.toUpperCase()} />;
  }
  if (manualJoin) {
    return <JoinFlow onBack={() => setManualJoin(false)} />;
  }
  return <AdminFlow onRequestJoin={() => setManualJoin(true)} previewMode={previewMode} />;
}
