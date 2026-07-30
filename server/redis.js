import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL;

const redis = REDIS_URL
  ? new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) {
          console.warn('[CACHE] Redis unavailable after 3 retries — running without cache');
          return null;
        }
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    })
  : null;

if (redis) {
  redis.connect().catch(() => {});
  redis.on('connect', () => console.log('[CACHE] Redis connected'));
  redis.on('error', (err) => {
    if (err.code !== 'ECONNREFUSED') {
      console.warn('[CACHE] Redis error:', err.message);
    }
  });
} else {
  console.warn('[CACHE] REDIS_URL not set — cache disabled');
}

export default redis;
