const BASE = "/api";

async function request(path, options) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok && !("ok" in data)) {
    throw new Error(`요청 실패: ${path}`);
  }
  return data;
}

export function fetchMeta() {
  return request("/meta");
}

export function fetchWeather(date) {
  return request(`/weather?date=${encodeURIComponent(date)}`);
}

export function fetchRecommendations(payload) {
  return request("/recommend", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchActivityDetail(activity) {
  return request("/activity-detail", {
    method: "POST",
    body: JSON.stringify({ activity }),
  });
}

export function createRoom(payload) {
  return request("/rooms", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchRoom(code) {
  return request(`/rooms/${code}`);
}

export function joinRoom(code, name) {
  return request(`/rooms/${code}/join`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function castVote(code, name, activityIndex) {
  return request(`/rooms/${code}/vote`, {
    method: "POST",
    body: JSON.stringify({ name, activityIndex }),
  });
}

export function closeRoom(code) {
  return request(`/rooms/${code}/close`, { method: "POST" });
}
