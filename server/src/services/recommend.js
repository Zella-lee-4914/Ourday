import { ACTIVITIES } from "../data/activities.js";

function matchesType(activity, placeType) {
  if (!placeType || placeType === "모두") return true;
  return activity.type === placeType;
}

function matchesPeople(activity, teamSize) {
  if (!teamSize) return true;
  return teamSize >= activity.minPeople && teamSize <= activity.maxPeople;
}

function matchesKeyword(activity, keywords) {
  if (!keywords || keywords.length === 0) return true;
  return activity.keywords.some((k) => keywords.includes(k));
}

// title만으로는 서로 다른 위치의 동명 활동(예: "방탈출 카페"가 홍대/신촌에 각각 존재)을
// 구분하지 못해 하나가 부당하게 제외되므로, title+location 조합을 고유 키로 쓴다.
function activityKey(activity) {
  return `${activity.title}|${activity.location}`;
}

const RECOMMEND_COUNT = 10;

/**
 * 조건 기반 규칙 추천 엔진. Claude API 미설정/실패 시 폴백으로 사용된다.
 *
 * 최종 정렬(예산 근접 -> 리뷰 순 -> 강남구 근접)은 예약 링크 조회(네이버 API) 이후에야
 * 알 수 있는 정보(리뷰 순위)가 필요해서 여기서 하지 않는다 - routes/recommend.js가
 * enrichBookingLinks로 조회한 뒤 정렬까지 담당한다. 이 함수는 "정렬 가능한 후보 풀"만
 * 만든다: 활동 장소 유형(F-07)은 어떤 단계에서도 완화하지 않고, 인원수 -> 키워드 매칭
 * 순으로 조건을 완화하며 최소 count개 이상을 확보할 때까지 단계를 넓힌다. (예산은 더 이상
 * 하드 필터가 아니라 정렬 기준이라 여기서 걸러내지 않는다.)
 */
export function recommendActivities({
  teamSize,
  keywords = [],
  placeType = "모두",
  count = RECOMMEND_COUNT,
} = {}) {
  const stages = [
    (a) => matchesType(a, placeType) && matchesPeople(a, teamSize) && matchesKeyword(a, keywords),
    (a) => matchesType(a, placeType) && matchesKeyword(a, keywords),
    (a) => matchesType(a, placeType) && matchesPeople(a, teamSize),
    (a) => matchesType(a, placeType),
  ];

  for (const stage of stages) {
    const pool = ACTIVITIES.filter(stage);
    if (pool.length >= count || stage === stages[stages.length - 1]) {
      // 중복 활동 방지(동일 title+location)
      const seen = new Set();
      const deduped = [];
      for (const a of pool) {
        const key = activityKey(a);
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push({ ...a });
      }
      return deduped;
    }
  }

  return [];
}
