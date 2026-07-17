const SEOUL_LAT = 37.5665;
const SEOUL_LON = 126.978;

// WMO weather interpretation codes -> icon + Korean description
const WEATHER_CODE_MAP = {
  0: { icon: "☀️", desc: "맑음" },
  1: { icon: "🌤️", desc: "대체로 맑음" },
  2: { icon: "⛅", desc: "구름 조금" },
  3: { icon: "☁️", desc: "흐림" },
  45: { icon: "🌫️", desc: "안개" },
  48: { icon: "🌫️", desc: "짙은 안개" },
  51: { icon: "🌦️", desc: "약한 이슬비" },
  53: { icon: "🌦️", desc: "이슬비" },
  55: { icon: "🌦️", desc: "강한 이슬비" },
  61: { icon: "🌧️", desc: "약한 비" },
  63: { icon: "🌧️", desc: "비" },
  65: { icon: "🌧️", desc: "강한 비" },
  71: { icon: "🌨️", desc: "약한 눈" },
  73: { icon: "🌨️", desc: "눈" },
  75: { icon: "❄️", desc: "강한 눈" },
  80: { icon: "🌦️", desc: "약한 소나기" },
  81: { icon: "🌧️", desc: "소나기" },
  82: { icon: "⛈️", desc: "강한 소나기" },
  95: { icon: "⛈️", desc: "천둥번개" },
  96: { icon: "⛈️", desc: "우박 동반 천둥번개" },
  99: { icon: "⛈️", desc: "강한 우박 동반 천둥번개" },
};

function describeCode(code) {
  return WEATHER_CODE_MAP[code] || { icon: "🌡️", desc: "정보 없음" };
}

export async function getWeatherForDate(dateStr) {
  const target = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(target.getTime())) {
    return { ok: false, reason: "invalid_date" };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));

  // Open-Meteo free forecast covers today .. +15 days reliably
  if (diffDays < 0 || diffDays > 15) {
    return { ok: false, reason: "out_of_range" };
  }

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${SEOUL_LAT}&longitude=${SEOUL_LON}` +
    `&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=Asia%2FSeoul` +
    `&start_date=${dateStr}&end_date=${dateStr}`;

  const res = await fetch(url);
  if (!res.ok) {
    return { ok: false, reason: "api_error" };
  }
  const data = await res.json();
  const code = data?.daily?.weathercode?.[0];
  const max = data?.daily?.temperature_2m_max?.[0];
  const min = data?.daily?.temperature_2m_min?.[0];

  if (code === undefined || max === undefined || min === undefined) {
    return { ok: false, reason: "no_data" };
  }

  const { icon, desc } = describeCode(code);
  return {
    ok: true,
    date: dateStr,
    icon,
    description: desc,
    tempMax: Math.round(max),
    tempMin: Math.round(min),
  };
}
