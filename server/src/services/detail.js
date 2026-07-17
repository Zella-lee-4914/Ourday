const cache = new Map();

const HIGHLIGHT_POOL = {
  활동적: "몸을 움직이며 활력을 되찾을 수 있어요",
  창의적: "직접 만들고 완성하는 성취감을 느낄 수 있어요",
  여유로운: "서두르지 않고 편안한 분위기에서 즐길 수 있어요",
  소통중심: "자연스럽게 대화가 이어지는 구조로 진행돼요",
  도전적: "짜릿한 몰입감으로 팀워크를 다질 수 있어요",
  문화체험: "새로운 문화를 경험하며 시야를 넓힐 수 있어요",
};

const DIFFICULTY_BY_KEYWORD = {
  도전적: "중~상",
  활동적: "중",
};

function pickHighlights(activity) {
  const fromKeywords = activity.keywords
    .map((k) => HIGHLIGHT_POOL[k])
    .filter(Boolean);
  const generic = [
    `${activity.location} 현지에서 바로 즐길 수 있는 활동이에요`,
    `${activity.duration} 동안 알차게 구성되어 있어요`,
  ];
  const combined = [...fromKeywords, ...generic];
  return combined.slice(0, 3);
}

function parseDurationMinutes(duration) {
  const hourMatch = duration.match(/([\d.]+)\s*시간/);
  const minMatch = duration.match(/(\d+)\s*분/);
  let minutes = 0;
  if (hourMatch) minutes += parseFloat(hourMatch[1]) * 60;
  if (minMatch) minutes += parseInt(minMatch[1], 10);
  return minutes || 90;
}

function buildSchedule(activity) {
  const totalMinutes = parseDurationMinutes(activity.duration);
  const steps = [
    { label: "오리엔테이션 및 안전 안내", ratio: 0.15 },
    { label: `${activity.title} 본 활동 진행`, ratio: 0.65 },
    { label: "마무리 및 정리", ratio: 0.2 },
  ];
  let cursor = 0;
  return steps.map((step) => {
    const start = Math.round(cursor);
    const dur = Math.round(totalMinutes * step.ratio);
    cursor += dur;
    return { time: `+${start}분`, label: step.label, minutes: dur };
  });
}

function buildIncluded(activity) {
  return {
    included: ["체험/이용 비용", "필요 재료 및 도구", "진행 강사/스태프"],
    excluded: ["개인 교통비", "개인 간식 및 음료", "추가 옵션 상품"],
  };
}

function buildParticipantInfo(activity) {
  const difficulty =
    activity.keywords.map((k) => DIFFICULTY_BY_KEYWORD[k]).find(Boolean) || "하";
  const dressCode =
    activity.type === "야외"
      ? "활동하기 편한 복장 및 운동화 권장"
      : "특별한 복장 제약 없음 (편한 복장 권장)";
  const recommendedRange =
    activity.minPeople && activity.maxPeople
      ? `${activity.minPeople}~${activity.maxPeople}명`
      : "제한 없음";
  return {
    recommendedRange,
    difficulty,
    dressCode,
  };
}

function buildTips(activity) {
  const tips = [
    `예약 시 ${activity.location} 현지 상황에 따라 일정이 변동될 수 있어요`,
    "인원 변경 시 최소 1~2일 전 안내가 필요해요",
  ];
  if (activity.type === "야외") tips.push("우천 시 실내 대체 일정을 미리 확인해 두세요");
  return tips;
}

/**
 * 활동 상세 정보 목업 생성 (실제 Claude API 호출 대신 규칙 기반 템플릿 사용).
 * 동일 활동 재조회 시 캐시된 데이터를 반환한다.
 */
export function getActivityDetail(activity) {
  const cacheKey = activity.title;
  if (cache.has(cacheKey)) {
    return { ...cache.get(cacheKey), cached: true };
  }

  const detail = {
    highlights: pickHighlights(activity),
    schedule: buildSchedule(activity),
    ...buildIncluded(activity),
    participantInfo: buildParticipantInfo(activity),
    tips: buildTips(activity),
  };

  cache.set(cacheKey, detail);
  return { ...detail, cached: false };
}
