const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-sonnet-5";
const REQUEST_TIMEOUT_MS = 20000;

function buildPrompt({ teamSize, budget, districts, keywords, placeType, weather, count }) {
  const districtText = districts.length > 0 ? districts.join(", ") : "제한 없음 (서울 전역)";
  const placeTypeText = placeType === "모두" ? "실내/야외 무관" : placeType;
  const weatherText = weather?.ok
    ? `${weather.description}, 최저 ${weather.tempMin}° / 최고 ${weather.tempMax}°`
    : "정보 없음";

  return `너는 한국 서울 지역 팀빌딩 액티비티 추천 전문가야. 아래 조건에 맞는 팀빌딩 액티비티를 정확히 ${count}개 추천해줘.

[조건]
- 팀 인원: ${teamSize || "미지정"}명
- 1인당 예산: ${budget ? `${budget.toLocaleString()}원 이하` : "제한 없음"}
- 선호 지역(서울 구): ${districtText}
- 활동 성향 키워드: ${keywords.join(", ")}
- 활동 장소 유형: ${placeTypeText} (반드시 이 조건을 지킬 것. "모두"가 아니면 지정된 타입만 추천)
- 활동 날짜 날씨: ${weatherText} (날씨가 좋지 않으면 실내 활동 비중을 높일 것)

[출력 형식]
아래 JSON 스키마를 따르는 배열만 출력해. 설명, 마크다운 코드블록, 그 외 텍스트는 절대 포함하지 마.
[
  {
    "title": "활동명",
    "type": "실내" 또는 "야외",
    "duration": "예: 2시간",
    "pricePerPerson": 숫자(원 단위),
    "description": "2~3문장 설명",
    "keywords": ["${"활동적/창의적/여유로운/소통중심/도전적/문화체험/힐링/미식/경쟁/이색체험 중 1~2개"}"],
    "bookingLink": "실제 검색 가능한 네이버 지도 검색 URL (https://map.naver.com/p/search/장소명 형식)",
    "location": "서울 내 구체적 위치명",
    "district": "서울 25개 구 중 하나",
    "minPeople": 숫자,
    "maxPeople": 숫자
  }
]

반드시 서로 다른 ${count}개의 활동을 추천하고, 실제로 서울에 존재할 법한 장소/활동으로 구성해줘.`;
}

function extractJsonArray(text) {
  const trimmed = text.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fencedMatch ? fencedMatch[1] : trimmed;
  const start = candidate.indexOf("[");
  const end = candidate.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("응답에서 JSON 배열을 찾을 수 없음");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

function validateActivity(a) {
  return (
    a &&
    typeof a.title === "string" &&
    (a.type === "실내" || a.type === "야외") &&
    typeof a.duration === "string" &&
    typeof a.pricePerPerson === "number" &&
    typeof a.description === "string" &&
    Array.isArray(a.keywords) &&
    typeof a.bookingLink === "string" &&
    typeof a.location === "string"
  );
}

/**
 * 실제 Claude API를 호출해 조건에 맞는 활동을 생성한다.
 * ANTHROPIC_API_KEY가 없거나 호출/파싱에 실패하면 에러를 던져 recommend.js의 규칙 기반 폴백으로 넘어가게 한다.
 */
export async function recommendWithClaude(params) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY not set");
  }

  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        messages: [{ role: "user", content: buildPrompt(params) }],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Anthropic API error ${res.status}: ${body.slice(0, 200)}`);
    }

    const data = await res.json();
    const text = data?.content?.[0]?.text;
    if (!text) throw new Error("Anthropic 응답에 텍스트 없음");

    const parsed = extractJsonArray(text);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error("Anthropic 응답이 빈 배열이거나 배열이 아님");
    }

    const valid = parsed.filter(validateActivity);
    if (valid.length === 0) {
      throw new Error("Anthropic 응답 항목이 스키마 검증을 통과하지 못함");
    }

    return valid;
  } finally {
    clearTimeout(timeout);
  }
}
