import AdminFlow from "./pages/AdminFlow.jsx";
import JoinFlow from "./pages/JoinFlow.jsx";

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const roomCode = params.get("room");

  if (roomCode) {
    return <JoinFlow initialCode={roomCode.toUpperCase()} />;
  }
  return <AdminFlow />;
}
