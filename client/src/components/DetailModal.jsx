import { useEffect, useState } from "react";
import { fetchActivityDetail } from "../api/client.js";

export default function DetailModal({ activity, isCandidate, onClose, onToggleCandidate }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetchActivityDetail(activity)
      .then((res) => {
        if (cancelled) return;
        if (res.ok) setDetail(res.detail);
        else setError(true);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activity]);

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const showBookingCta = activity.bookingLinkVerified !== false;

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-sheet">
        <div className="modal-header">
          <h2 style={{ fontSize: 17, fontWeight: 700 }}>{activity.title}</h2>
          <button className="modal-close" onClick={onClose} type="button">✕</button>
        </div>

        {loading && (
          <div className="loading-block">
            <div className="pulse-dot" />
            <span>상세 정보를 불러오는 중...</span>
          </div>
        )}

        {!loading && error && (
          <div className="error-banner">상세 정보를 불러오지 못했어요. 잠시 후 다시 시도해주세요.</div>
        )}

        {!loading && !error && detail && (
          <>
            <div className="detail-section">
              <div className="detail-section-title">✨ 이런 점이 좋아요</div>
              <ul className="include-list">
                {detail.highlights.map((h, i) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            </div>

            <div className="detail-section">
              <div className="detail-section-title">🗓 예상 일정</div>
              {detail.schedule.map((step, i) => (
                <div className="schedule-item" key={i}>
                  <span className="schedule-time">{step.time}</span>
                  <span>{step.label} ({step.minutes}분)</span>
                </div>
              ))}
            </div>

            <div className="detail-section">
              <div className="detail-section-title">💰 포함 / 불포함</div>
              <div className="include-grid">
                <div>
                  <div className="include-col-title included">포함</div>
                  <ul className="include-list">
                    {detail.included.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                </div>
                <div>
                  <div className="include-col-title excluded">불포함</div>
                  <ul className="include-list">
                    {detail.excluded.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                </div>
              </div>
            </div>

            <div className="detail-section">
              <div className="detail-section-title">👥 참여 정보</div>
              <p style={{ fontSize: 13, lineHeight: 1.8 }}>
                권장 인원: {detail.participantInfo.recommendedRange}<br />
                난이도: {detail.participantInfo.difficulty}<br />
                복장 안내: {detail.participantInfo.dressCode}
              </p>
            </div>

            <div className="detail-section">
              <div className="detail-section-title">📌 참고 사항</div>
              <ul className="include-list">
                {detail.tips.map((tip, i) => <li key={i}>{tip}</li>)}
              </ul>
            </div>
          </>
        )}

        {showBookingCta ? (
          <div className="cta-row">
            <button
              type="button"
              className="cta-btn secondary"
              onClick={() => onToggleCandidate(activity)}
            >
              {isCandidate ? "후보에서 제거" : "투표 후보로 추가"}
            </button>
            <a
              href={activity.bookingLink}
              target="_blank"
              rel="noreferrer"
              className="cta-btn"
              style={{ textDecoration: "none", textAlign: "center" }}
            >
              예약하러 가기
            </a>
          </div>
        ) : (
          <button
            type="button"
            className="cta-btn secondary"
            onClick={() => onToggleCandidate(activity)}
          >
            {isCandidate ? "후보에서 제거" : "투표 후보로 추가"}
          </button>
        )}
      </div>
    </div>
  );
}
