import { ACTIVITIES } from "../data/activities.js";

function matchesType(activity, placeType) {
  if (!placeType || placeType === "모두") return true;
  return activity.type === placeType;
}

function matchesPeople(activity, teamSize) {
  if (!teamSize) return true;
  return teamSize >= activity.minPeople && teamSize <= activity.maxPeople;
}

// 선택한 키워드와 몇 개나 겹치는지(0 = 전혀 안 맞음)를 계산한다. 필터가 아니라 정렬 우선순위로
// 쓰기 위한 값이라, 매칭이 0개인 활동도 후보 풀에는 남고 정렬에서 뒤로 밀리기만 한다.
function keywordMatchCount(activity, keywords) {
  if (!keywords || keywords.length === 0) return 0;
  return activity.keywords.filter((k) => keywords.includes(k)).length;
}

// title만으로는 서로 다른 위치의 동명 활동(예: "방탈출 카페"가 홍대/신촌에 각각 존재)을
// 구분하지 못해 하나가 부당하게 제외되므로, title+location 조합을 고유 키로 쓴다.
function activityKey(activity) {
  return `${activity.title}|${activity.location}`;
}

const RECOMMEND_COUNT = 10;
// 네이버 API 조회(예약 링크 확인) 대상 풀의 상한. 데이터셋 크기가 커져도 매 요청마다 호출하는
// API 수를 일정하게 유지하기 위한 값이다.
const CANDIDATE_POOL_CAP = 20;

/**
 * 조건 기반 규칙 추천 엔진. Claude API 미설정/실패 시 폴백으로 사용된다.
 *
 * 활동 장소 유형(F-07)은 하드 필터로 유지하고, 인원수는 만족하는 후보가 count개 미만이면
 * 완화한다. 키워드는 더 이상 하드 필터가 아니라 "정렬 우선순위"다 - 매칭 개수가 많은 활동이
 * 항상 앞에 오도록 미리 정렬해두고(2차로는 예산 근접도), 그중 상위 CANDIDATE_POOL_CAP개만
 * 반환한다. 이렇게 하면 키워드 매칭이 0개여도 예산에 가까운 활동이 자리를 채워 늘 충분한 수의
 * 후보를 돌려주면서도, 실제로 그 키워드에 맞는 활동은 항상 우선적으로 노출된다.
 *
 * 최종 정렬(리뷰 순 -> 강남구 근접까지 포함한 정밀 정렬)은 예약 링크 조회(네이버 API)
 * 이후에야 알 수 있는 정보(리뷰 순위)가 필요해서 routes/recommend.js가 맡는다. 거기서도
 * keywordMatchCount를 최우선 정렬 기준으로 그대로 사용한다.
 */
export function recommendActivities({
  teamSize,
  budget,
  keywords = [],
  placeType = "모두",
  count = RECOMMEND_COUNT,
} = {}) {
  const typeFiltered = ACTIVITIES.filter((a) => matchesType(a, placeType));
  const peopleFiltered = typeFiltered.filter((a) => matchesPeople(a, teamSize));
  const basePool = peopleFiltered.length >= count ? peopleFiltered : typeFiltered;

  const seen = new Set();
  const deduped = [];
  for (const a of basePool) {
    const key = activityKey(a);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push({ ...a, keywordMatchCount: keywordMatchCount(a, keywords) });
  }

  const budgetDiff = (a) => (budget ? Math.abs(a.pricePerPerson - budget) : 0);
  deduped.sort((a, b) => b.keywordMatchCount - a.keywordMatchCount || budgetDiff(a) - budgetDiff(b));

  return deduped.slice(0, CANDIDATE_POOL_CAP);
}
