// 데이터셋(activities.js)의 각 활동이 실제로 예약/지도 CTA를 눌렀을 때 진짜 검색 결과를
// 내는지 사전 검증하는 스크립트. recommend.js가 런타임에 쓰는 것과 동일한 검색어
// ({location} {title})와 동일한 로직(findBestBookingLink)을 그대로 재사용한다.
//
// 사용법: node scripts/auditBookingLinks.js   (server/.env의 NAVER_CLIENT_ID/SECRET 필요)
//
// 주의: 네이버 지역 검색 API는 짧은 시간에 많은 요청을 연달아 보내면 실제로 존재하는 장소도
// 순간적으로 결과 없음(rate limit)으로 잘못 나올 수 있다. 그래서 요청 사이에 딜레이를 둔다.
import "../src/loadEnv.js";
import { ACTIVITIES } from "../src/data/activities.js";
import { findBestBookingLink } from "../src/services/naverPlace.js";

const REQUEST_DELAY_MS = 600;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  if (!process.env.NAVER_CLIENT_ID || !process.env.NAVER_CLIENT_SECRET) {
    console.error("NAVER_CLIENT_ID/NAVER_CLIENT_SECRET이 설정되어 있지 않습니다 (server/.env 확인).");
    process.exit(1);
  }

  const results = [];
  for (const activity of ACTIVITIES) {
    const query = `${activity.location} ${activity.title}`;
    const found = await findBestBookingLink(query, activity.district);
    results.push({ activity, query, found });

    const label =
      found.status === "found"
        ? `FOUND -> ${found.title} (${found.link})`
        : found.status === "place"
        ? `PLACE -> ${found.title}, ${found.address} ${found.coord ? `[좌표 O -> 네이버 지도 좌표 링크]` : `[좌표 X -> 네이버 텍스트 검색, 결과 없음 위험]`}`
        : "MISS  -> 검색 결과 없음";
    console.log(`[${activity.district}] ${query.padEnd(28)} ${label}`);

    await wait(REQUEST_DELAY_MS);
  }

  const missed = results.filter((r) => r.found.status === "unconfirmed");
  const placeNoCoord = results.filter((r) => r.found.status === "place" && !r.found.coord);
  console.log("---");
  console.log(
    `총 ${results.length}개 중 FOUND ${results.filter((r) => r.found.status === "found").length}개, ` +
      `PLACE ${results.filter((r) => r.found.status === "place").length}개, ` +
      `MISS ${missed.length}개`
  );
  if (missed.length > 0) {
    console.log("\nMISS(검색 결과 없음, 지도 CTA가 빈 결과로 이어질 수 있음):");
    missed.forEach((r) => console.log(`  - [${r.activity.district}] ${r.activity.title} @ ${r.activity.location}`));
    console.log("\n주의: rate limit으로 인한 일시적 오탐일 수 있으니, 시간을 두고 한 번 더 확인해보세요.");
  }
  if (placeNoCoord.length > 0) {
    console.log("\nPLACE인데 좌표가 없어 여전히 네이버 텍스트 검색에 의존하는 항목:");
    placeNoCoord.forEach((r) => console.log(`  - [${r.activity.district}] ${r.activity.title} @ ${r.activity.location}`));
  }
}

main();
