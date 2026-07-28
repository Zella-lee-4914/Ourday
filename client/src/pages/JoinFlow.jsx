import { useState } from "react";
import ResultBars from "../components/ResultBars.jsx";
import { usePolling } from "../utils/usePolling.js";
import { fetchRoom, joinRoom as joinRoomApi, castVote } from "../api/client.js";

export default function JoinFlow({ initialCode }) {
  const [code, setCode] = useState(initialCode || "");
  const [name, setName] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState(null);
  const [room, setRoom] = useState(null);
  const [voting, setVoting] = useState(false);

  const handleJoin = async (e) => {
    e.preventDefault();
    const trimmedCode = code.trim().toUpperCase();
    const trimmedName = name.trim();
    if (!trimmedCode || !trimmedName) return;

    setJoining(true);
    setJoinError(null);
    try {
      const res = await joinRoomApi(trimmedCode, trimmedName);
      if (res.ok) {
        setCode(trimmedCode);
        setRoom(res.room);
      } else if (res.reason === "not_found") {
        setJoinError("존재하지 않는 방 코드예요. 코드를 다시 확인해주세요.");
      } else {
        setJoinError("참여에 실패했어요. 다시 시도해주세요.");
      }
    } catch {
      setJoinError("참여에 실패했어요. 다시 시도해주세요.");
    } finally {
      setJoining(false);
    }
  };

  usePolling(
    async () => {
      if (!room) return;
      try {
        const res = await fetchRoom(code);
        if (res.ok) setRoom(res.room);
      } catch {
        // 폴링 실패는 조용히 무시
      }
    },
    3000,
    !!room && !room.done
  );

  const handleVote = async (idx) => {
    if (voting || room.done) return;
    setVoting(true);
    try {
      const res = await castVote(code, name.trim(), idx);
      if (res.ok) setRoom(res.room);
    } finally {
      setVoting(false);
    }
  };

  if (!room) {
    return (
      <div className="center-page">
        <div className="brand-title">아워데이</div>
        <p className="page-subtitle">투표에 참여하려면 이름을 입력해주세요.</p>
        <form onSubmit={handleJoin}>
          <div className="section">
            <div className="section-label">방 코드</div>
            <input
              className="name-input"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="예: AB12CD"
              maxLength={6}
              readOnly={!!initialCode}
            />
          </div>
          <div className="section">
            <div className="section-label">이름(닉네임)</div>
            <input
              className="name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름을 입력해주세요"
              maxLength={20}
            />
          </div>
          {joinError && <div className="error-banner">{joinError}</div>}
          <button type="submit" className="cta-btn" disabled={joining}>
            {joining ? "참여 중..." : "참여하기"}
          </button>
        </form>
      </div>
    );
  }

  if (room.done) {
    return (
      <div className="page">
        <h1 className="page-title">투표 결과</h1>
        <p className="page-subtitle">방장이 투표를 마감했어요.</p>
        <ResultBars
          activities={room.acts}
          cands={room.cands}
          voters={room.voters}
          totalVoters={Object.keys(room.voters).length}
        />
      </div>
    );
  }

  const myBallot = room.voters[name.trim()] || {};

  return (
    <div className="page">
      <h1 className="page-title">투표하기</h1>
      <p className="page-subtitle">원하는 활동 하나를 골라주세요. 다시 눌러 취소하거나 변경할 수 있어요.</p>
      <div className="vote-list">
        {room.cands.map((idx) => {
          const activity = room.acts[idx];
          const voted = !!myBallot[idx];
          return (
            <div className={`vote-row ${voted ? "voted" : ""}`} key={idx}>
              <div>
                <div style={{ fontWeight: 500 }}>{activity.title}</div>
                <div className="helper-text">{activity.type} · {activity.pricePerPerson.toLocaleString()}원 · {activity.duration}</div>
              </div>
              <button
                type="button"
                className="vote-icon-btn"
                onClick={() => handleVote(idx)}
                disabled={voting}
              >
                {voted ? "✓" : "♡"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
