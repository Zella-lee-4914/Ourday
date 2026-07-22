import { Router } from "express";
import { recommendActivities } from "../services/recommend.js";
import { recommendWithClaude } from "../services/claudeRecommend.js";
import { findBestBookingLink } from "../services/naverPlace.js";

const router = Router();
const RECOMMEND_COUNT = 10;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 각 활동에 대해 네이버 지역 검색으로 실제 업체를 찾아 bookingLink를 교체한다.
 * NAVER_CLIENT_ID/SECRET 미설정이거나 검색 실패 시 원래 링크를 그대로 둔다 (best-effort).
 */
async function enrichBookingLinks(activities) {
  const results = await Promise.all(
    activities.map(async (activity) => {
      try {
        const found = await findBestBookingLink(`${activity.location} ${activity.title}`);
        if (found?.link) return { ...activity, bookingLink: found.link };
      } catch {
        // best-effort: 실패 시 원래 링크 유지
      }
      return activity;
    })
  );
  return results;
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
    count: RECOMMEND_COUNT,
  };

  try {
    const activities = await recommendWithClaude(params);
    const enriched = await enrichBookingLinks(activities);
    return res.json({ ok: true, source: "claude", activities: enriched });
  } catch (err) {
    console.warn("Claude 추천 실패, 규칙 기반 폴백으로 전환:", err.message);
  }

  try {
    // 폴백 경로도 "AI 추천 중" 로딩 UX를 유지하기 위한 인위적 지연
    await wait(600 + Math.random() * 900);
    const activities = recommendActivities(params);
    const enriched = await enrichBookingLinks(activities);
    res.json({ ok: true, source: "fallback", activities: enriched });
  } catch (err) {
    console.error("recommend fallback error", err);
    res.status(500).json({ ok: false, reason: "server_error" });
  }
});

export default router;
