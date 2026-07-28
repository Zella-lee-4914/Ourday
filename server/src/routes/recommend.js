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
 * 각 활동에 대해 네이버 지역 검색으로 실제 업체 링크를 확인한다.
 * 추천 개수는 항상 그대로 유지하고, 대신 각 활동에 bookingLinkVerified 플래그를 붙인다.
 * - true: 업체의 확인된 자체 링크를 찾아 bookingLink를 교체함 -> 클라이언트에서 예약 CTA 활성화
 * - false: 검색 결과 없음/자체 링크 없음/오류 -> 클라이언트에서 예약 CTA 숨김 처리
 * (네이버 키 자체가 없으면 검증을 시도하지 않고 모두 verified 취급해 기존 동작을 유지한다)
 */
async function enrichBookingLinks(activities) {
  return Promise.all(
    activities.map(async (activity) => {
      const found = await findBestBookingLink(`${activity.location} ${activity.title}`);
      if (found.status === "found") {
        return { ...activity, bookingLink: found.link, bookingLinkVerified: true };
      }
      if (found.status === "not_configured") {
        return { ...activity, bookingLinkVerified: true };
      }
      return { ...activity, bookingLinkVerified: false };
    })
  );
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
