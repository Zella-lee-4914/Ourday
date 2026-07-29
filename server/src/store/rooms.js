const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const REDIS_ENABLED = Boolean(REDIS_URL && REDIS_TOKEN);

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROOM_TTL_SECONDS = 24 * 60 * 60; // 24시간

function roomKey(code) {
  return `ourday:room:${code}`;
}

/**
 * Upstash Redis REST API에 단일 명령을 실행한다.
 * https://<endpoint> 로 명령 배열(예: ["SET", key, value])을 POST하면
 * { result } 형태로 응답한다.
 */
async function redisCommand(command) {
  const res = await fetch(REDIS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });
  if (!res.ok) throw new Error(`Upstash Redis error ${res.status}`);
  const data = await res.json();
  return data.result;
}

// --- 메모리 백엔드: UPSTASH_REDIS_REST_URL/TOKEN이 없을 때 쓰는 로컬 개발용 폴백.
// 서버 재시작 시 데이터가 사라진다 (프로덕션에서는 REDIS_ENABLED가 true여야 함). ---
const memoryRooms = new Map();

const memoryBackend = {
  async has(code) {
    return memoryRooms.has(code);
  },
  async get(code) {
    return memoryRooms.get(code) || null;
  },
  async set(code, room) {
    memoryRooms.set(code, room);
  },
};

const redisBackend = {
  async has(code) {
    return (await redisCommand(["EXISTS", roomKey(code)])) === 1;
  },
  async get(code) {
    const result = await redisCommand(["GET", roomKey(code)]);
    return result ? JSON.parse(result) : null;
  },
  async set(code, room) {
    await redisCommand(["SET", roomKey(code), JSON.stringify(room), "EX", String(ROOM_TTL_SECONDS)]);
  },
};

const backend = REDIS_ENABLED ? redisBackend : memoryBackend;

async function generateCode() {
  let code;
  do {
    code = Array.from({ length: 6 }, () =>
      CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
    ).join("");
  } while (await backend.has(code));
  return code;
}

export async function createRoom({ acts, cands }) {
  const code = await generateCode();
  const room = {
    code,
    acts,
    cands,
    voters: {},
    done: false,
    createdAt: Date.now(),
  };
  await backend.set(code, room);
  return room;
}

export async function getRoom(code) {
  if (!code) return null;
  return backend.get(code.toUpperCase());
}

export async function joinRoom(code, name) {
  const room = await getRoom(code);
  if (!room) return null;
  if (!room.voters[name]) {
    const entry = {};
    room.cands.forEach((idx) => {
      entry[idx] = false;
    });
    room.voters[name] = entry;
  }
  await backend.set(room.code, room);
  return room;
}

export async function castVote(code, name, activityIndex) {
  const room = await getRoom(code);
  if (!room) return null;
  if (!room.voters[name]) return null;
  if (room.done) return room;

  const current = room.voters[name];
  const wasVoted = !!current[activityIndex];
  Object.keys(current).forEach((key) => {
    current[key] = false;
  });
  current[activityIndex] = !wasVoted;
  await backend.set(room.code, room);
  return room;
}

export async function closeRoom(code) {
  const room = await getRoom(code);
  if (!room) return null;
  room.done = true;
  await backend.set(room.code, room);
  return room;
}

// 메모리 폴백을 쓸 때만 필요: 24시간 지난 방을 정리해 메모리 누수를 막는다.
// Redis 백엔드는 SET할 때 EX 옵션으로 TTL을 걸어두므로 별도 정리가 필요 없다.
if (!REDIS_ENABLED) {
  setInterval(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    for (const [code, room] of memoryRooms.entries()) {
      if (room.createdAt < cutoff) memoryRooms.delete(code);
    }
  }, 60 * 60 * 1000);
}
