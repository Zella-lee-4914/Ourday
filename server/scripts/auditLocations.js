// 데이터셋(activities.js)의 location 값이 실제 네이버 지도에 존재하는 장소인지 감사(audit)하는 스크립트.
// 데이터셋을 추가/수정할 때마다 실행해서 "존재하지 않는 장소명"이 섞여 들어가는 걸 미리 걸러낸다.
//
// 사용법: npm run audit:locations   (server/.env의 NAVER_CLIENT_ID/SECRET 필요)
//
// 주의: 네이버 지역 검색 API는 짧은 시간에 많은 요청을 연달아 보내면 실제로 존재하는 장소도
// 순간적으로 결과 없음(rate limit)으로 잘못 나올 수 있다. 그래서 요청 사이에 딜레이를 둔다.
import "../src/loadEnv.js";
import { ACTIVITIES } from "../src/data/activities.js";

const REQUEST_DELAY_MS = 600;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stripTags(html) {
  return html.replace(/<[^>]*>/g, "");
}

async function checkLocation(location, clientId, clientSecret) {
  const url = `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(location)}&display=1`;
  const res = await fetch(url, {
    headers: {
      "X-Naver-Client-Id": clientId,
      "X-Naver-Client-Secret": clientSecret,
    },
  });
  if (!res.ok) return { ok: false, reason: `http_${res.status}` };
  const data = await res.json();
  const top = data?.items?.[0];
  if (!top) return { ok: false, reason: "no_results" };
  return { ok: true, matched: stripTags(top.title || "") };
}

async function main() {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error("NAVER_CLIENT_ID/NAVER_CLIENT_SECRET이 설정되어 있지 않습니다 (server/.env 확인).");
    process.exit(1);
  }

  // 같은 location이 여러 활동에서 재사용되므로 중복 없이 한 번씩만 확인한다.
  const uniqueLocations = [...new Set(ACTIVITIES.map((a) => a.location))];

  const results = [];
  for (const location of uniqueLocations) {
    const result = await checkLocation(location, clientId, clientSecret);
    results.push({ location, ...result });
    const status = result.ok ? `OK   -> ${result.matched}` : `MISS (${result.reason})`;
    console.log(`${location.padEnd(14)} ${status}`);
    await wait(REQUEST_DELAY_MS);
  }

  const missing = results.filter((r) => !r.ok);
  console.log("---");
  console.log(`총 ${uniqueLocations.length}개 중 확인됨 ${uniqueLocations.length - missing.length}개, 미확인 ${missing.length}개`);
  if (missing.length > 0) {
    console.log("미확인 location:", missing.map((r) => r.location).join(", "));
    console.log("주의: rate limit으로 인한 일시적 오탐일 수 있으니, 시간을 두고 한 번 더 확인해보세요.");
  }
}

main();
