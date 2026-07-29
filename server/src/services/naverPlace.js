const NAVER_LOCAL_SEARCH_URL = "https://openapi.naver.com/v1/search/local.json";
const REQUEST_TIMEOUT_MS = 4000;

// 업체가 top.link에 SNS/커뮤니티 주소를 등록해두는 경우가 많다. 예약/상세 정보 확인이
// 목적인 CTA가 인스타그램 프로필 등으로 랜딩되지 않도록 이런 도메인은 "확인된 링크"로 보지 않는다.
const SNS_LINK_HOSTS = [
  "instagram.com",
  "facebook.com",
  "fb.com",
  "blog.naver.com",
  "m.blog.naver.com",
  "cafe.naver.com",
  "youtube.com",
  "youtu.be",
  "tiktok.com",
  "twitter.com",
  "x.com",
  "threads.net",
  "band.us",
  "kakao.com",
  "pf.kakao.com",
];

function stripTags(html) {
  return html.replace(/<[^>]*>/g, "");
}

function isSnsLink(link) {
  try {
    const host = new URL(link).hostname.replace(/^www\./, "");
    return SNS_LINK_HOSTS.some((sns) => host === sns || host.endsWith(`.${sns}`));
  } catch {
    return false;
  }
}

/**
 * 네이버 지역 검색 API로 특정 활동에 맞는 실제 업체를 찾는다.
 * 공식 API는 평점을 제공하지 않아 sort=comment(리뷰 많은 순)를 "인기/평점"의 대체 지표로 사용한다.
 *
 * 반환 형태 (status로 구분):
 * - { status: "found", link, title }    : 업체가 등록한 자체 링크(SNS 제외)를 확인함, 그대로 사용
 * - { status: "place", title, address } : 자체 링크는 없거나 SNS라 못 쓰지만, 검색 API가 실제
 *                                          업체를 찾음 -> 업체명+주소로 지도 검색하면 결과가 보장됨
 * - { status: "not_configured" }        : NAVER_CLIENT_ID/SECRET 미설정 (기능 자체가 꺼져 있음)
 * - { status: "unconfirmed" }           : 결과 없음 / 오류·타임아웃 등, 확실한 링크를 보장 못함
 */
export async function findBestBookingLink(query) {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  if (!clientId || !clientSecret) return { status: "not_configured" };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const url = `${NAVER_LOCAL_SEARCH_URL}?query=${encodeURIComponent(query)}&display=5&start=1&sort=comment`;
    const res = await fetch(url, {
      headers: {
        "X-Naver-Client-Id": clientId,
        "X-Naver-Client-Secret": clientSecret,
      },
      signal: controller.signal,
    });

    if (!res.ok) return { status: "unconfirmed" };

    const data = await res.json();
    const top = data?.items?.[0];
    if (!top) return { status: "unconfirmed" };

    const title = stripTags(top.title || "");

    if (top.link && /^https?:\/\//.test(top.link) && !isSnsLink(top.link)) {
      return { status: "found", link: top.link, title };
    }

    const address = stripTags(top.roadAddress || top.address || "");
    if (title && address) {
      return { status: "place", title, address };
    }

    return { status: "unconfirmed" };
  } catch {
    return { status: "unconfirmed" };
  } finally {
    clearTimeout(timeout);
  }
}
