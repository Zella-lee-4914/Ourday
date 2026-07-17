import ResultBars from "./ResultBars.jsx";
import { usePolling } from "../utils/usePolling.js";
import { fetchRoom, closeRoom } from "../api/client.js";

function buildShareUrl(code) {
  const url = new URL(window.location.href);
  url.searchParams.set("room", code);
  return url.toString();
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export default function Step4Vote({ room, setRoom, copyStatus, setCopyStatus }) {
  usePolling(
    async () => {
      if (!room) return;
      try {
        const res = await fetchRoom(room.code);
        if (res.ok) setRoom(res.room);
      } catch {
        // 폴링 실패는 조용히 무시하고 다음 주기에 재시도
      }
    },
    3000,
    !!room && !room.done
  );

  const handleRecopy = async () => {
    if (!room) return;
    const copied = await copyToClipboard(buildShareUrl(room.code));
    setCopyStatus(copied ? "링크가 클립보드에 복사되었어요" : "복사에 실패했어요");
  };

  const handleClose = async () => {
    if (!room) return;
    const res = await closeRoom(room.code);
    if (res.ok) setRoom(res.room);
  };

  if (!room) {
    return (
      <div className="loading-block">
        <div className="pulse-dot" />
        <span>투표방을 만드는 중...</span>
      </div>
    );
  }

  if (room.done) {
    return (
      <div>
        <h1 className="page-title">투표 결과</h1>
        <p className="page-subtitle">투표가 마감되었어요.</p>
        <ResultBars
          activities={room.acts}
          cands={room.cands}
          voters={room.voters}
          totalVoters={Object.keys(room.voters).length}
        />
      </div>
    );
  }

  const voterNames = Object.keys(room.voters);

  return (
    <div>
      <h1 className="page-title">실시간 투표 진행 중</h1>
      <p className="page-subtitle">팀원들에게 링크를 공유하고 투표 현황을 확인하세요.</p>

      <div className="room-code-box">
        <div className="helper-text">방 코드</div>
        <div className="room-code">{room.code}</div>
        <button type="button" className="copy-btn" onClick={handleRecopy}>
          링크 복사
        </button>
        {copyStatus && <p className="helper-text">{copyStatus}</p>}
      </div>

      <div className="section">
        <div className="section-label">참여 현황 ({voterNames.length}명)</div>
        <div className="participant-list">
          {voterNames.length === 0 && <p className="helper-text">아직 참여한 팀원이 없어요.</p>}
          {voterNames.map((name) => {
            const done = Object.values(room.voters[name]).some(Boolean);
            return (
              <div className="participant-row" key={name}>
                <span>{name}</span>
                {done && <span className="participant-check">✓ 투표 완료</span>}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <button type="button" className="cta-btn" onClick={handleClose}>
          투표 마감하기
        </button>
      </div>
    </div>
  );
}
