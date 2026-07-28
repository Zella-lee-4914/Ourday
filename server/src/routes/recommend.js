import { Router } from "express";
import { recommendActivities } from "../services/recommend.js";
import { recommendWithClaude } from "../services/claudeRecommend.js";
import { findBestBookingLink } from "../services/naverPlace.js";

const router = Router();
const RECOMMEND_COUNT = 10;
// 네이버 검색 결과가 아예 없는 활동은 걸러내야 하므로, 여유분을 더 생성해서 채운다.
const GENERATE_BUFFER = 6;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 각 활동에 대해 네이버 지역 검색으로 실제 업체를 찾아 bookingLink를 교체한다.
 * - 검색 결과가 아예 없는(no_results) 활동은 예약할 곳이 없다는 뜻이므로 목록에서 제외한다.
 * - 키 미설정/오류(unavailable)일 때는 확인 자체가 안 된 것이므로 기존 링크를 그대로 유지한다.
 */
async function enrichBookingLinks(activities) {
  const results = await Promise.all(
    activities.map(async (activity) => {
      const found = await findBestBookingLink(`${activity.location} ${activity.title}`);
      if (found.status === "found") return { ...activity, bookingLink: found.link };
      if (found.status === "no_results") return null;
      return activity; // unavailable: best-effort로 원래 링크 유지
    })
  );
  return results.filter(Boolean);
}

router.post("/recommend", async (req, res) => {
  const { teamSize, budget, districts, keywords, placeType, weather } = req.body || {};

  if (!Array.isArray(keywords) || keywords.length === 0) {
    return res.status(400).json({ ok: false, reason: "keywords_required" });
  }

  const params = {
    teamSize: Number(teamSize) || undefined,
    budget: Number(budget) || undefined,
    districts: Array.isArray(districts) ? districts : [],
    keywords,
    placeType: placeType || "모두",
    weather,
    count: RECOMMEND_COUNT + GENERATE_BUFFER,
  };

  try {
    const activities = await recommendWithClaude(params);
    const enriched = (await enrichBookingLinks(activities)).slice(0, RECOMMEND_COUNT);
    return res.json({ ok: true, source: "claude", activities: enriched });
  } catch (err) {
    console.warn("Claude 추천 실패, 규칙 기반 폴백으로 전환:", err.message);
  }

  try {
    // 폴백 경로도 "AI 추천 중" 로딩 UX를 유지하기 위한 인위적 지연
    await wait(600 + Math.random() * 900);
    const activities = recommendActivities(params);
    const enriched = (await enrichBookingLinks(activities)).slice(0, RECOMMEND_COUNT);
    res.json({ ok: true, source: "fallback", activities: enriched });
  } catch (err) {
    console.error("recommend fallback error", err);
    res.status(500).json({ ok: false, reason: "server_error" });
  }
});

export default router;
