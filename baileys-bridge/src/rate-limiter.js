const MAX_PER_MINUTE = parseInt(process.env.MAX_MSGS_PER_MINUTE || "30", 10);
const MAX_PER_DAY = parseInt(process.env.MAX_MSGS_PER_DAY || "200", 10);

const counters = new Map();

function getCounter(sessionId) {
  if (!counters.has(sessionId)) {
    counters.set(sessionId, { minute: [], day: [] });
  }
  return counters.get(sessionId);
}

function check(sessionId) {
  const c = getCounter(sessionId);
  const now = Date.now();
  const oneMinuteAgo = now - 60_000;
  const oneDayAgo = now - 86_400_000;

  c.minute = c.minute.filter((t) => t > oneMinuteAgo);
  c.day = c.day.filter((t) => t > oneDayAgo);

  if (c.minute.length >= MAX_PER_MINUTE) {
    return { allowed: false, reason: `Rate limit: ${MAX_PER_MINUTE}/min exceeded` };
  }
  if (c.day.length >= MAX_PER_DAY) {
    return { allowed: false, reason: `Rate limit: ${MAX_PER_DAY}/day exceeded` };
  }
  return { allowed: true };
}

function record(sessionId) {
  const c = getCounter(sessionId);
  const now = Date.now();
  c.minute.push(now);
  c.day.push(now);
}

module.exports = { check, record };
