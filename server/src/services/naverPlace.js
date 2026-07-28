const NAVER_LOCAL_SEARCH_URL = "https://openapi.naver.com/v1/search/local.json";
const REQUEST_TIMEOUT_MS = 4000;

function stripTags(html) {
  return html.replace(/<[^>]*>/g, "");
}

/**
 * 네이버 지역 검색 API로 특정 활동에 맞는 실제 업체를 찾는다.
 * 공식 API는 평점을 제공하지 않아 sort=comment(리뷰 많은 순)를 "인기/평점"의 대체 지표로 사용한다.
 *
 * "확인된 링크"만 신뢰한다: 업체가 등록한 자체 링크(top.link)가 있을 때만 유효한 것으로 본다.
 * 링크가 없어 "업체명+주소"로 지도 검색 URL을 재구성하는 방식은 실제로는 검색 결과가 없는
 * 경우가 많아(API 인덱스와 지도 웹 검색 인덱스가 다름) 신뢰할 수 없으므로 더 이상 사용하지 않는다.
 *
 * 반환 형태 (status로 구분):
 * - { status: "found", link, title } : 업체 자체 링크를 확인함, 그대로 사용
 * - { status: "not_configured" }     : NAVER_CLIENT_ID/SECRET 미설정 (기능 자체가 꺼져 있음)
 * - { status: "unconfirmed" }        : 결과 없음 / 자체 링크 없음 / 오류·타임아웃 등, 확실한 링크를 보장 못함
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

    if (top.link && /^https?:\/\//.test(top.link)) {
      return { status: "found", link: top.link, title: stripTags(top.title || "") };
    }

    return { status: "unconfirmed" };
  } catch {
    return { status: "unconfirmed" };
  } finally {
    clearTimeout(timeout);
  }
}
