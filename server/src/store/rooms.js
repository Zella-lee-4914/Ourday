const rooms = new Map();

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode() {
  let code;
  do {
    code = Array.from({ length: 6 }, () =>
      CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
    ).join("");
  } while (rooms.has(code));
  return code;
}

export function createRoom({ acts, cands }) {
  const code = generateCode();
  const room = {
    code,
    acts,
    cands,
    voters: {},
    done: false,
    createdAt: Date.now(),
  };
  rooms.set(code, room);
  return room;
}

export function getRoom(code) {
  return rooms.get(code?.toUpperCase()) || null;
}

export function joinRoom(code, name) {
  const room = getRoom(code);
  if (!room) return null;
  if (!room.voters[name]) {
    const entry = {};
    room.cands.forEach((idx) => {
      entry[idx] = false;
    });
    room.voters[name] = entry;
  }
  return room;
}

export function castVote(code, name, activityIndex) {
  const room = getRoom(code);
  if (!room) return null;
  if (!room.voters[name]) return null;
  if (room.done) return room;

  const current = room.voters[name];
  const wasVoted = !!current[activityIndex];
  Object.keys(current).forEach((key) => {
    current[key] = false;
  });
  current[activityIndex] = !wasVoted;
  return room;
}

export function closeRoom(code) {
  const room = getRoom(code);
  if (!room) return null;
  room.done = true;
  return room;
}

// Clean up rooms older than 24h to avoid unbounded memory growth
setInterval(() => {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  for (const [code, room] of rooms.entries()) {
    if (room.createdAt < cutoff) rooms.delete(code);
  }
}, 60 * 60 * 1000);
