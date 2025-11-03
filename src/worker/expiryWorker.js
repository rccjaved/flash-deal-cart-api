const { client } = require('../redisClient');
const { RESERVATION_KEY, EXPIRY_ZSET, USER_RESERVATIONS } = require('../services/reservationService');
const { STOCK_KEY } = require('../services/productService');

async function releaseExpiredReservations() {
  const now = Math.floor(Date.now() / 1000);
  // get expired reservation ids (limit batch to avoid blocking)
  const expired = await client.zRangeByScore(EXPIRY_ZSET, 0, now, { LIMIT: { offset: 0, count: 100 } });
  if (!expired || expired.length === 0) return 0;
  for (const rid of expired) {
    try {
      const key = RESERVATION_KEY(rid);
      const h = await client.hGetAll(key);
      if (!h || !h.qty) {
        // possibly already processed; remove zset entry
        await client.zRem(EXPIRY_ZSET, rid);
        continue;
      }
      const qty = Number(h.qty);
      const productId = h.productId;
      const userId = h.userId;
      // increment stock back
      await client.incrBy(STOCK_KEY(productId), qty);
      // remove reservation
      await client.del(key);
      await client.zRem(EXPIRY_ZSET, rid);
      await client.sRem(USER_RESERVATIONS(userId), rid);
      console.log(`Released reservation ${rid} for product ${productId} qty ${qty}`);
    } catch (err) {
      console.error('Error releasing reservation', rid, err);
    }
  }
  return expired.length;
}

let workerInterval;
function startWorker(intervalMs = 5000) {
  if (workerInterval) return;
  workerInterval = setInterval(async () => {
    try {
      await releaseExpiredReservations();
    } catch (err) {
      console.error('Expiry worker error', err);
    }
  }, intervalMs);
  console.log('Started reservation expiry worker');
}
module.exports = { startWorker, releaseExpiredReservations };
