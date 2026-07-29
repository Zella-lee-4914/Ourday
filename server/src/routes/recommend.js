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
 * 추천 개수는 항상 그대로 유지하고, 각 활동에 bookingLinkVerified 플래그를 붙인다.
 * - true: 업체가 등록한 자체 링크(SNS 제외)를 찾아 bookingLink를 교체함 -> "예약하러 가기"로 표시
 * - false: 특정 업체 홈페이지는 확인 못 했지만, 검색 API가 실제 업체를 찾음("place"). 이때
 *   "업체명+주소"로 네이버 지도 텍스트 검색 URL을 만드는 방식은 API 인덱스와 지도 웹 검색
 *   인덱스가 달라 실제로는 결과 없음이 잦다는 게 확인됐다(사용자 리포트로 재확인). 그래서
 *   좌표(coord)가 있으면 텍스트 검색 대신 좌표를 직접 지정하는 네이버 지도 링크
 *   (`map.naver.com/?lng=...&lat=...&title=...`, 네이버가 공식 문서화하진 않았지만 네이버
 *   클라우드플랫폼 포럼에서 네이버 담당자가 동작을 확인해준 방식)를 쓴다 - 텍스트 매칭에
 *   의존하지 않으므로 결과 없음이 구조적으로 불가능하다. 좌표조차 없을 때만 "장소명 + 활동명"
 *   문구로 네이버 지도 텍스트 검색을 추측 시도한다("unconfirmed", 결과가 없을 수도 있는 최후 수단).
 *   클라이언트에서는 세 경우 모두 "지도에서 위치 보기"로 표시.
 * (네이버 키 자체가 없으면 검증을 시도하지 않고 모두 verified 취급해 기존 링크를 유지한다)
 */
async function enrichBookingLinks(activities) {
  return Promise.all(
    activities.map(async (activity) => {
      const found = await findBestBookingLink(`${activity.location} ${activity.title}`, activity.district);
      if (found.status === "found") {
        return { ...activity, bookingLink: found.link, bookingLinkVerified: true };
      }
      if (found.status === "not_configured") {
        return { ...activity, bookingLinkVerified: true };
      }
      if (found.status === "place") {
        const bookingLink = found.coord
          ? `https://map.naver.com/?lng=${found.coord.lng}&lat=${found.coord.lat}&title=${encodeURIComponent(found.title)}`
          : `https://map.naver.com/p/search/${encodeURIComponent(`${found.title} ${found.address}`)}`;
        return { ...activity, bookingLink, bookingLinkVerified: false };
      }
      return {
        ...activity,
        bookingLink: `https://map.naver.com/p/search/${encodeURIComponent(`${activity.location} ${activity.title}`)}`,
        bookingLinkVerified: false,
      };
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
