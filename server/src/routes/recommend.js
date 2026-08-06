import { Router } from "express";
import { recommendActivities } from "../services/recommend.js";
import { recommendWithClaude } from "../services/claudeRecommend.js";
import { findBestBookingLink, isLinkAlive } from "../services/naverPlace.js";
import { distanceFromGangnam } from "../data/districtDistance.js";

const router = Router();
const RECOMMEND_COUNT = 10;
const WORST_RANK = 99; // rankIndex를 못 구한 활동(unconfirmed)은 리뷰 순위 최하위로 취급

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// "장소명 + 활동명" 검색어를 만들되, 같은 단어(부분 문자열 포함)가 중복되면 한 번만 남긴다.
// 예: 장소 "뚝섬 한강공원" + 활동명 "한강 카약 체험" -> "뚝섬 한강공원 카약 체험" ("한강"이 이미
// "한강공원"에 포함되어 있으므로 제외).
function buildSearchQuery(location, title) {
  const words = [...location.split(/\s+/), ...title.split(/\s+/)].filter(Boolean);
  const result = [];
  let acc = "";
  for (const word of words) {
    if (acc.includes(word)) continue;
    result.push(word);
    acc = acc ? `${acc} ${word}` : word;
  }
  return result.join(" ");
}

// "네이버 검색 결과"는 일반 웹 검색이 아니라 네이버 지도 검색 결과 페이지를 가리킨다.
function naverMapSearchLink(activity) {
  return `https://map.naver.com/p/search/${encodeURIComponent(
    buildSearchQuery(activity.location, activity.title)
  )}`;
}

/**
 * 후보 풀 전체에 대해 네이버 지역 검색으로 실제 업체 매칭 여부와 리뷰 순위(rankIndex)를 조회한다.
 * 정렬(예산 근접 -> 리뷰 순 -> 강남구 근접)에 rankIndex가 필요해서, 최종 후보를 추리기 전에
 * 풀 전체를 먼저 조회해야 한다. (네이버 키가 없으면 모두 홈페이지 없음으로 취급)
 */
async function attachSearchInfo(activities) {
  return Promise.all(
    activities.map(async (activity) => {
      const found = await findBestBookingLink(`${activity.location} ${activity.title}`, activity.district);
      return { activity, found };
    })
  );
}

/**
 * 규칙:
 * 정렬 순서 - 0) 선택한 키워드와 일치하는 개수(많이 맞을수록 위), 1) 선택한 예산에 가까운 항목,
 * 2) 리뷰 순(rankIndex 근사치), 3) 강남구에서 가까운 지역 순
 */
function compareByRule(a, b, budget) {
  const byKeyword = (b.activity.keywordMatchCount || 0) - (a.activity.keywordMatchCount || 0);
  if (byKeyword !== 0) return byKeyword;

  const budgetDiff = (entry) => (budget ? Math.abs(entry.activity.pricePerPerson - budget) : 0);
  const byBudget = budgetDiff(a) - budgetDiff(b);
  if (byBudget !== 0) return byBudget;

  const rank = (entry) => (typeof entry.found.rankIndex === "number" ? entry.found.rankIndex : WORST_RANK);
  const byReview = rank(a) - rank(b);
  if (byReview !== 0) return byReview;

  const byDistance =
    distanceFromGangnam(a.activity.district) - distanceFromGangnam(b.activity.district);
  return byDistance;
}

/**
 * 각 활동에 CTA 규칙을 적용한다.
 * 1) 특정 업체의 홈페이지가 있는 경우 -> "예약하러 가기" + 그 홈페이지로 랜딩
 * 2) 홈페이지가 없거나, 있어도 실제 접속 시 오류가 나는 경우 -> "지도에서 찾기" + 네이버 지도
 *    검색 결과 페이지로 랜딩 (검색어: "장소+활동명", 중복 단어 제거)
 */
async function applyCtaRule(entry) {
  const { activity, found } = entry;
  // keywordMatchCount는 정렬 전용 내부 값이라 클라이언트 응답에는 포함하지 않는다.
  const { keywordMatchCount, ...publicActivity } = activity;
  if (found.status === "found" && (await isLinkAlive(found.link))) {
    return { ...publicActivity, bookingLink: found.link, bookingLinkVerified: true };
  }
  return { ...publicActivity, bookingLink: naverMapSearchLink(activity), bookingLinkVerified: false };
}

router.post("/recommend", async (req, res) => {
  const { teamSize, budget, districts, keywords, placeType, weather } = req.body || {};

  if (!Array.isArray(keywords) || keywords.length === 0) {
    return res.status(400).json({ ok: false, reason: "keywords_required" });
  }

  const numericBudget = Number(budget) || undefined;
  const params = {
    teamSize: Number(teamSize) || undefined,
    budget: numericBudget,
    districts: Array.isArray(districts) ? districts : [],
    keywords,
    placeType: placeType || "모두",
    weather,
    count: RECOMMEND_COUNT,
  };

  let pool;
  let source;
  try {
    pool = await recommendWithClaude(params);
    source = "claude";
  } catch (err) {
    console.warn("Claude 추천 실패, 규칙 기반 폴백으로 전환:", err.message);
  }

  if (!pool) {
    try {
      // 폴백 경로도 "AI 추천 중" 로딩 UX를 유지하기 위한 인위적 지연
      await wait(600 + Math.random() * 900);
      pool = recommendActivities(params);
      source = "fallback";
    } catch (err) {
      console.error("recommend fallback error", err);
      return res.status(500).json({ ok: false, reason: "server_error" });
    }
  }

  try {
    const withSearchInfo = await attachSearchInfo(pool);
    withSearchInfo.sort((a, b) => compareByRule(a, b, numericBudget));
    const top = withSearchInfo.slice(0, RECOMMEND_COUNT);
    const activities = await Promise.all(top.map(applyCtaRule));
    res.json({ ok: true, source, activities });
  } catch (err) {
    console.error("recommend enrichment error", err);
    res.status(500).json({ ok: false, reason: "server_error" });
  }
});

export default router;
