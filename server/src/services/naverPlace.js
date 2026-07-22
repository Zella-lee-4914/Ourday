const NAVER_LOCAL_SEARCH_URL = "https://openapi.naver.com/v1/search/local.json";
const REQUEST_TIMEOUT_MS = 4000;

function stripTags(html) {
  return html.replace(/<[^>]*>/g, "");
}

/**
 * 네이버 지역 검색 API로 특정 활동에 맞는 실제 업체를 찾아 예약 링크를 만든다.
 * 공식 API는 평점을 제공하지 않아 sort=comment(리뷰 많은 순)를 "인기/평점"의 대체 지표로 사용한다.
 * NAVER_CLIENT_ID/SECRET이 없거나 호출 실패/결과 없음이면 null을 반환해 기존 링크를 그대로 쓰게 한다.
 */
export async function findBestBookingLink(query) {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

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

    if (!res.ok) return null;

    const data = await res.json();
    const top = data?.items?.[0];
    if (!top) return null;

    const title = stripTags(top.title || "");
    const address = top.roadAddress || top.address || "";

    // 업체 자체 홈페이지/플레이스 링크가 있으면 그대로 사용
    if (top.link && /^https?:\/\//.test(top.link)) {
      return { link: top.link, title };
    }

    // 없으면 "업체명 + 주소"로 검색해 사실상 해당 업체 하나로 특정되는 네이버 지도 링크 생성
    const mapQuery = `${title} ${address}`.trim();
    return {
      link: `https://map.naver.com/p/search/${encodeURIComponent(mapQuery)}`,
      title,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
