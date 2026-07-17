/**
 * voters 객체를 순회하여 후보(activity index)별 득표 수를 집계한다. (9.3 클라이언트 사이드 집계)
 */
export function computeTally(cands, voters) {
  const tally = {};
  cands.forEach((idx) => {
    tally[idx] = 0;
  });
  Object.values(voters || {}).forEach((ballot) => {
    cands.forEach((idx) => {
      if (ballot[idx]) tally[idx] += 1;
    });
  });
  return tally;
}

export function getWinners(cands, tally) {
  const max = Math.max(0, ...cands.map((idx) => tally[idx] || 0));
  if (max === 0) return [];
  return cands.filter((idx) => (tally[idx] || 0) === max);
}
