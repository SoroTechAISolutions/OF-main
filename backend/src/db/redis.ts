import { createClient } from 'redis';

// Redis client
export const redisClient = createClient({
  url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`
});

redisClient.on('error', (err) => console.error('Redis Client Error:', err));

// Test Redis connection
export async function testRedisConnection(): Promise<void> {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }

  // Test set/get
  await redisClient.set('test_key', 'Hello from OF Agency!');
  const value = await redisClient.get('test_key');
  console.log(`Redis test value: ${value}`);
  await redisClient.del('test_key');
}

// Get Redis client (connect if needed)
export async function getRedis() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
  return redisClient;
}
