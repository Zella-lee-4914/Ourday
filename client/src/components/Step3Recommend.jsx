import { useEffect, useState } from "react";
import ActivityCard from "./ActivityCard.jsx";
import DetailModal from "./DetailModal.jsx";
import { fetchRecommendations } from "../api/client.js";

export default function Step3Recommend({ state, setState }) {
  const [detailIdx, setDetailIdx] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (state.activities.length > 0 || state.recLoading) return;
    setState((s) => ({ ...s, recLoading: true }));
    setError(null);
    fetchRecommendations({
      teamSize: state.teamSize,
      budget: state.budget,
      districts: state.districts,
      keywords: state.keywords,
      placeType: state.placeType,
      weather: state.weather,
    })
      .then((res) => {
        if (res.ok) {
          // F-07 이중 검증: 실내/야외 지정 시 서버 응답을 클라이언트에서도 한 번 더 필터링
          const filtered =
            state.placeType === "모두"
              ? res.activities
              : res.activities.filter((a) => a.type === state.placeType);
          setState((s) => ({ ...s, activities: filtered, recLoading: false }));
        } else {
          setError("추천 활동을 불러오지 못했어요.");
          setState((s) => ({ ...s, recLoading: false }));
        }
      })
      .catch(() => {
        setError("추천 활동을 불러오지 못했어요.");
        setState((s) => ({ ...s, recLoading: false }));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleCandidate = (idx) => {
    setState((s) => ({
      ...s,
      candidates: s.candidates.includes(idx)
        ? s.candidates.filter((c) => c !== idx)
        : [...s.candidates, idx],
    }));
  };

  return (
    <div>
      <h1 className="page-title">AI 추천 활동</h1>
      <p className="page-subtitle">조건에 맞는 활동 10가지를 추천해드렸어요. 마음에 드는 활동을 투표 후보로 선택해주세요.</p>

      {error && <div className="error-banner">{error}</div>}

      {state.recLoading && (
        <div className="activity-grid">
          {Array.from({ length: 10 }).map((_, i) => (
            <div className="skeleton-card" key={i} />
          ))}
        </div>
      )}

      {!state.recLoading && state.activities.length > 0 && (
        <div className="activity-grid">
          {state.activities.map((activity, idx) => (
            <ActivityCard
              key={idx}
              activity={activity}
              idx={idx}
              isCandidate={state.candidates.includes(idx)}
              onToggleCandidate={toggleCandidate}
              onOpenDetail={setDetailIdx}
            />
          ))}
        </div>
      )}

      {detailIdx !== null && (
        <DetailModal
          activity={state.activities[detailIdx]}
          isCandidate={state.candidates.includes(detailIdx)}
          onToggleCandidate={() => toggleCandidate(detailIdx)}
          onClose={() => setDetailIdx(null)}
        />
      )}
    </div>
  );
}
