import { computeTally, getWinners } from "../utils/tally.js";

export default function ResultBars({ activities, cands, voters, totalVoters }) {
  const tally = computeTally(cands, voters);
  const winners = getWinners(cands, tally);
  const maxVotes = Math.max(1, ...cands.map((idx) => tally[idx] || 0));

  return (
    <div>
      {typeof totalVoters === "number" && (
        <p className="helper-text" style={{ marginBottom: 16 }}>
          총 참여자 수: {totalVoters}명
        </p>
      )}
      {cands.map((idx) => {
        const activity = activities[idx];
        const votes = tally[idx] || 0;
        const isWinner = winners.includes(idx);
        return (
          <div className={`result-row ${isWinner ? "winner" : ""}`} key={idx}>
            <div className="result-row-head">
              <span>{isWinner ? "🏆 " : ""}{activity.title}</span>
              <span>{votes}표</span>
            </div>
            <div className="result-bar-track">
              <div
                className="result-bar-fill"
                style={{ width: `${(votes / maxVotes) * 100}%` }}
              />
            </div>
            {isWinner && (
              <a
                href={activity.bookingLink}
                target="_blank"
                rel="noreferrer"
                className="mini-cta"
                style={{ textDecoration: "none", marginTop: 8 }}
              >
                {activity.bookingLinkVerified === false ? "지도에서 위치 보기" : "예약하러 가기"}
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}
