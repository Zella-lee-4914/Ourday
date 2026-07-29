// 서울 25개 구 구청 좌표(대략치) 기반으로 강남구청과의 직선거리를 계산해둔 표.
// "강남구에서 가까운 지역 순" 정렬 기준(F-정렬규칙)에 사용된다.
const GU_COORDS = {
  강남구: [37.5172, 127.0473],
  강동구: [37.5301, 127.1238],
  강북구: [37.6396, 127.0257],
  강서구: [37.5509, 126.8495],
  관악구: [37.4784, 126.9516],
  광진구: [37.5384, 127.0822],
  구로구: [37.4954, 126.8874],
  금천구: [37.4569, 126.8956],
  노원구: [37.6542, 127.0568],
  도봉구: [37.6688, 127.0471],
  동대문구: [37.5744, 127.04],
  동작구: [37.5124, 126.9393],
  마포구: [37.5663, 126.9019],
  서대문구: [37.5791, 126.9368],
  서초구: [37.4837, 127.0324],
  성동구: [37.5633, 127.0367],
  성북구: [37.5894, 127.0167],
  송파구: [37.5145, 127.1059],
  양천구: [37.5169, 126.8664],
  영등포구: [37.5263, 126.8966],
  용산구: [37.5323, 126.9908],
  은평구: [37.6027, 126.9291],
  종로구: [37.573, 126.9794],
  중구: [37.5638, 126.9976],
  중랑구: [37.6063, 127.0929],
};

const GANGNAM = GU_COORDS["강남구"];
const EARTH_RADIUS_KM = 6371;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function haversineKm([lat1, lng1], [lat2, lng2]) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// 구 이름 -> 강남구청까지의 직선거리(km). 강남구 자신은 0.
export const DISTANCE_FROM_GANGNAM_KM = Object.fromEntries(
  Object.entries(GU_COORDS).map(([gu, coord]) => [gu, haversineKm(GANGNAM, coord)])
);

export function distanceFromGangnam(district) {
  return DISTANCE_FROM_GANGNAM_KM[district] ?? Infinity;
}
