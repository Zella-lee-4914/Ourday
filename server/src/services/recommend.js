import { ACTIVITIES } from "../data/activities.js";

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function matchesType(activity, placeType) {
  if (!placeType || placeType === "모두") return true;
  return activity.type === placeType;
}

function matchesPeople(activity, teamSize) {
  if (!teamSize) return true;
  return teamSize >= activity.minPeople && teamSize <= activity.maxPeople;
}

function matchesBudget(activity, budget) {
  if (!budget) return true;
  return activity.pricePerPerson <= budget;
}

function scoreKeywords(activity, keywords) {
  if (!keywords || keywords.length === 0) return 0;
  return activity.keywords.filter((k) => keywords.includes(k)).length;
}

function scoreDistrict(activity, districts) {
  if (!districts || districts.length === 0) return 0;
  return districts.includes(activity.district) ? 1 : 0;
}

// 예산 이하이기만 하면 되는 게 아니라, 예산에 최대한 근접한 활동을 우선한다.
// 완화 단계(2/3단계)에서는 예산을 넘는 활동도 후보에 들어올 수 있으므로 절대 거리 기준으로 계산한다.
function scoreBudget(activity, budget) {
  if (!budget) return 0;
  const diffRatio = Math.abs(activity.pricePerPerson - budget) / budget;
  return Math.max(0, 1 - diffRatio) * 2;
}

// title만으로는 서로 다른 위치의 동명 활동(예: "방탈출 카페"가 홍대/신촌에 각각 존재)을
// 구분하지 못해 하나가 부당하게 제외되므로, title+location 조합을 고유 키로 쓴다.
function activityKey(activity) {
  return `${activity.title}|${activity.location}`;
}

const RECOMMEND_COUNT = 10;

/**
 * 조건 기반 규칙 추천 엔진. Claude API 미설정/실패 시 폴백으로 사용된다.
 * 엄격한 필터 -> 완화 순서로 조건을 풀어가며 최대한 RECOMMEND_COUNT개를 채운다.
 */
export function recommendActivities({
  teamSize,
  budget,
  districts = [],
  keywords = [],
  placeType = "모두",
  weather,
  count = RECOMMEND_COUNT,
} = {}) {
  const weatherBoost =
    weather?.ok && ["비", "약한 비", "강한 비", "눈", "약한 눈", "강한 눈", "천둥번개"].includes(weather.description)
      ? "실내"
      : null;

  // 실내/야외 지정 시 F-07 요구사항에 따라 장소 타입은 어떤 단계에서도 완화하지 않는다.
  // (인원/예산 조건만 단계적으로 완화, 5개를 못 채우더라도 타입 제약은 유지)
  const filterStages = [
    // 1단계: 모든 조건 엄격 적용 + 지역 가중치
    (a) => matchesType(a, placeType) && matchesPeople(a, teamSize) && matchesBudget(a, budget),
    // 2단계: 예산 조건 완화
    (a) => matchesType(a, placeType) && matchesPeople(a, teamSize),
    // 3단계: 인원 조건까지 완화 (타입은 유지)
    (a) => matchesType(a, placeType),
  ];

  const picked = [];
  const usedKeys = new Set();

  for (const stage of filterStages) {
    if (picked.length >= count) break;

    const candidates = ACTIVITIES.filter((a) => !usedKeys.has(activityKey(a)) && stage(a));

    const scored = candidates.map((a) => ({
      activity: a,
      score:
        scoreKeywords(a, keywords) * 2 +
        scoreDistrict(a, districts) +
        scoreBudget(a, budget) +
        (weatherBoost && a.type === weatherBoost ? 1 : 0) +
        Math.random() * 0.5, // 동점자 랜덤성 부여
    }));

    scored.sort((a, b) => b.score - a.score);

    for (const { activity } of scored) {
      if (picked.length >= count) break;
      picked.push(activity);
      usedKeys.add(activityKey(activity));
    }
  }

  return shuffle(picked)
    .slice(0, count)
    .map((a) => ({ ...a }));
}
