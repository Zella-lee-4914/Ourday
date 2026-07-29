export default function ActivityCard({ activity, idx, isCandidate, onToggleCandidate, onOpenDetail }) {
  return (
    <div className={`activity-card ${isCandidate ? "candidate" : ""}`}>
      <div className="activity-card-header">
        <span className="activity-title">{activity.title}</span>
        <span className={`type-badge ${activity.type === "야외" ? "outdoor" : ""}`}>
          {activity.type}
        </span>
      </div>
      <div className="activity-price">1인 {activity.pricePerPerson.toLocaleString()}원</div>
      <p className="activity-desc">{activity.description}</p>
      <div className="keyword-chips">
        {activity.keywords.map((k) => (
          <span className="chip" key={k}>{k}</span>
        ))}
      </div>
      <div className="activity-meta">
        <span>⏱ {activity.duration}</span>
        <span>📍 {activity.location}</span>
      </div>
      <div className="activity-card-footer">
        <button type="button" className="detail-link" onClick={() => onOpenDetail(idx)}>
          자세히 보기
        </button>
        <label className="candidate-checkbox">
          <input
            type="checkbox"
            checked={isCandidate}
            onChange={() => onToggleCandidate(idx)}
          />
          투표 후보로 추가
        </label>
      </div>
    </div>
  );
}
