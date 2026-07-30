import redis from '../redis.js';

export async function getOrSet(prefix, params, ttl, fetchFn) {
  if (!redis) return fetchFn();

  const version = prefix === 'products' ? await getVersion('products') : null;
  const key = version !== null
    ? `${prefix}:v${version}:${hashParams(params)}`
    : prefix;

  try {
    const cached = await redis.get(key);
    if (cached !== null) {
      console.log(`[CACHE] HIT  ${key}`);
      return JSON.parse(cached);
    }
  } catch (err) {
    console.warn(`[CACHE] ERR  ${key} (read): ${err.message}`);
  }

  console.log(`[CACHE] MISS ${key}`);
  const start = Date.now();
  const data = await fetchFn();
  const elapsed = Date.now() - start;

  try {
    await redis.setex(key, ttl, JSON.stringify(data));
    console.log(`[CACHE] SET  ${key} ← DB (took ${elapsed}ms)`);
  } catch (err) {
    console.warn(`[CACHE] ERR  ${key} (write): ${err.message}`);
  }

  return data;
}

export async function bumpVersion(prefix) {
  if (!redis) return;
  try {
    const v = await redis.incr(`${prefix}:version`);
    console.log(`[CACHE] BUMP ${prefix}:version → ${v}`);
  } catch (err) {
    console.warn(`[CACHE] ERR  bump ${prefix}:version: ${err.message}`);
  }
}

export async function del(key) {
  if (!redis) return;
  try {
    await redis.del(key);
    console.log(`[CACHE] DEL  ${key}`);
  } catch (err) {
    console.warn(`[CACHE] ERR  del ${key}: ${err.message}`);
  }
}

async function getVersion(prefix) {
  if (!redis) return 0;
  try {
    const v = await redis.get(`${prefix}:version`);
    return v ? parseInt(v, 10) : 0;
  } catch {
    return 0;
  }
}

function hashParams(params) {
  if (!params || Object.keys(params).length === 0) return '_';
  return Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join('|');
}
