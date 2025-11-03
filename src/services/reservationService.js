const { client } = require('../redisClient');
const { v4: uuidv4 } = require('uuid');
const { STOCK_KEY } = require('./productService');

const EXPIRY_ZSET = 'reservations:expiry';
const USER_RESERVATIONS = (userId) => `user:reservations:${userId}`;
const RESERVATION_KEY = (reservationId) => `reservation:${reservationId}`;

/*
Lua script to atomically:
- check if available stock >= qty
- decrement stock by qty
- create reservation hash with fields (userId, productId, qty, expiresAt)
- add reservationId to expiry zset
- add to user set
*/
const RESERVE_LUA = `
local stockKey = KEYS[1]
local reservationKey = KEYS[2]
local expiryZset = KEYS[3]
local userSet = KEYS[4]

local qty = tonumber(ARGV[1])
local userId = ARGV[2]
local productId = ARGV[3]
local reservationId = ARGV[4]
local expiresAt = tonumber(ARGV[5])
local ttl = tonumber(ARGV[6])

local current = tonumber(redis.call('GET', stockKey) or '0')
if current >= qty then
  redis.call('DECRBY', stockKey, qty)
  redis.call('HSET', reservationKey,
    'userId', userId,
    'productId', productId,
    'qty', tostring(qty),
    'createdAt', tostring(redis.call('TIME')[1]),
    'expiresAt', tostring(expiresAt)
  )
  -- set a backup TTL on hash
  if ttl > 0 then redis.call('EXPIRE', reservationKey, ttl) end
  redis.call('ZADD', expiryZset, expiresAt, reservationId)
  redis.call('SADD', userSet, reservationId)
  return 1
else
  return 0
end
`;

async function reserveSingle({ userId, productId, qty, ttlSeconds = 600 }) {
  const reservationId = uuidv4();
  const stockKey = STOCK_KEY(productId);
  const reservationKey = RESERVATION_KEY(reservationId);
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;

  const res = await client.eval(RESERVE_LUA, {
    keys: [stockKey, reservationKey, EXPIRY_ZSET, USER_RESERVATIONS(userId)],
    arguments: [String(qty), String(userId), String(productId), reservationId, String(expiresAt), String(ttlSeconds)]
  });
  if (res === 1) {
    return { reservationId, userId, productId, qty, expiresAt };
  } else {
    throw new Error('Not enough stock to reserve');
  }
}

async function reserveMultiple({ userId, items /* [{productId, qty}] */, ttlSeconds = 600 }) {
  // Reserve all-or-nothing: do an atomic multi-step using WATCH/MULTI or Lua.
  // For simplicity and correctness, do sequential Lua ops but if any fail, roll back previous reservations.
  // Steps:
  //  - try to reserve each with the Lua script (which decrements stock)
  //  - if any reservation fails, roll back previously reserved items (INCRBY back) and remove their reservation records
  const successes = [];
  try {
    for (const it of items) {
      const res = await reserveSingle({ userId, productId: it.productId, qty: it.qty, ttlSeconds });
      successes.push(res);
    }
    return successes;
  } catch (err) {
    // rollback
    for (const s of successes) {
      // fetch qty from reservation hash (if exists) then increment back and remove
      const key = RESERVATION_KEY(s.reservationId);
      const qStr = await client.hGet(key, 'qty');
      const q = qStr ? Number(qStr) : s.qty;
      await client.incrBy(STOCK_KEY(s.productId), q);
      await client.del(key);
      await client.zRem(EXPIRY_ZSET, s.reservationId);
      await client.sRem(USER_RESERVATIONS(userId), s.reservationId);
    }
    throw new Error(`Failed to reserve all items: ${err.message}`);
  }
}

async function getUserReservations(userId) {
  const ids = await client.sMembers(USER_RESERVATIONS(userId));
  const multi = client.multi();
  ids.forEach(id => multi.hGetAll(RESERVATION_KEY(id)));
  const results = await multi.exec();
  // results is array of objects; map to combine
  const out = [];
  ids.forEach((id, idx) => {
    const h = results[idx];
    if (h && Object.keys(h).length) out.push({ reservationId: id, ...h });
  });
  return out;
}

async function cancelReservation(userId, reservationId) {
  const key = RESERVATION_KEY(reservationId);
  const h = await client.hGetAll(key);
  if (!h || !h.qty) throw new Error('Reservation not found');
  if (String(h.userId) !== String(userId)) throw new Error('Not allowed');
  const qty = Number(h.qty);
  const productId = h.productId;
  await client.incrBy(STOCK_KEY(productId), qty);
  await client.del(key);
  await client.zRem(EXPIRY_ZSET, reservationId);
  await client.sRem(USER_RESERVATIONS(userId), reservationId);
  return true;
}

module.exports = {
  reserveSingle,
  reserveMultiple,
  getUserReservations,
  cancelReservation,
  RESERVATION_KEY,
  EXPIRY_ZSET,
  USER_RESERVATIONS
};
