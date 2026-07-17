import { Router } from "express";
import { recommendActivities } from "../services/recommend.js";
import { recommendWithClaude } from "../services/claudeRecommend.js";

const router = Router();
const RECOMMEND_COUNT = 10;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
    return res.json({ ok: true, source: "claude", activities });
  } catch (err) {
    console.warn("Claude 추천 실패, 규칙 기반 폴백으로 전환:", err.message);
  }

  try {
    // 폴백 경로도 "AI 추천 중" 로딩 UX를 유지하기 위한 인위적 지연
    await wait(600 + Math.random() * 900);
    const activities = recommendActivities(params);
    res.json({ ok: true, source: "fallback", activities });
  } catch (err) {
    console.error("recommend fallback error", err);
    res.status(500).json({ ok: false, reason: "server_error" });
  }
});

export default router;
