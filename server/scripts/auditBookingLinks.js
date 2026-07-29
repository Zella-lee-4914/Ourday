// 데이터셋(activities.js)의 각 활동에 대해 실제로 CTA를 눌렀을 때 무슨 일이 벌어지는지
// 사전 점검하는 스크립트. recommend.js 런타임과 동일한 로직(findBestBookingLink, isLinkAlive)을
// 그대로 재사용한다.
//
// 사용법: node scripts/auditBookingLinks.js   (server/.env의 NAVER_CLIENT_ID/SECRET 필요)
//
// 주의: 네이버 지역 검색 API는 짧은 시간에 많은 요청을 연달아 보내면 실제로 존재하는 장소도
// 순간적으로 결과 없음(rate limit)으로 잘못 나올 수 있다. 그래서 요청 사이에 딜레이를 둔다.
import "../src/loadEnv.js";
import { ACTIVITIES } from "../src/data/activities.js";
import { findBestBookingLink, isLinkAlive } from "../src/services/naverPlace.js";

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

    let label;
    if (found.status === "found") {
      const alive = await isLinkAlive(found.link);
      label = alive
        ? `예약하러 가기 -> ${found.link} (rank ${found.rankIndex})`
        : `홈페이지 있음이나 접속 불가(dead link) -> ${found.link}, 지도에서 찾기로 폴백됨`;
    } else if (found.status === "no_link") {
      label = `지도에서 찾기 (업체는 찾았지만 자체 링크 없음/SNS뿐, rank ${found.rankIndex})`;
    } else {
      label = "지도에서 찾기 (검색 API가 매칭 실패, 리뷰 순위 근사치 없음 - 최하위 취급됨)";
    }
    results.push({ activity, found, label });
    console.log(`[${activity.district}] ${query.padEnd(28)} ${label}`);

    await wait(REQUEST_DELAY_MS);
  }

  const dead = results.filter(
    (r) => r.found.status === "found" && r.label.includes("접속 불가")
  );
  const unconfirmed = results.filter((r) => r.found.status === "unconfirmed");
  console.log("---");
  console.log(
    `총 ${results.length}개 중 예약하러가기 ${results.filter((r) => r.found.status === "found" && !r.label.includes("접속 불가")).length}개, ` +
      `지도에서찾기(업체 확인됨) ${results.filter((r) => r.found.status === "no_link").length}개, ` +
      `지도에서찾기(매칭 실패) ${unconfirmed.length}개, ` +
      `죽은 링크 ${dead.length}개`
  );
  if (dead.length > 0) {
    console.log("\n홈페이지는 있지만 접속이 안 되는 항목(자동으로 지도에서 찾기로 폴백됨):");
    dead.forEach((r) => console.log(`  - [${r.activity.district}] ${r.activity.title} @ ${r.activity.location} -> ${r.found.link}`));
  }
}

main();
