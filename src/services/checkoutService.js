// src/services/checkoutService.js  (fallback, no transactions)
const Product = require('../models/Product');
const Order = require('../models/Order');
const { client } = require('../redisClient');
const { RESERVATION_KEY, EXPIRY_ZSET, USER_RESERVATIONS } = require('./reservationService');
const { STOCK_KEY } = require('./productService');

async function checkoutReservation(userId, reservationId) {
  const rKey = RESERVATION_KEY(reservationId);
  const r = await client.hGetAll(rKey);
  if (!r || !r.qty) throw new Error('Reservation not found or expired');
  if (String(r.userId) !== String(userId)) throw new Error('Not allowed');

  const productId = r.productId; // string ObjectId
  const qty = Number(r.qty);

  // 1) Atomically decrement product.total_stock only if enough stock remains
  const updated = await Product.findOneAndUpdate(
    { _id: productId, total_stock: { $gte: qty } },           // filter
    { $inc: { total_stock: -qty } },                         // update
    { new: true }                                            // return updated doc
  );

  if (!updated) {
    // This means DB currently has insufficient stock
    throw new Error('Not enough stock at DB to complete order');
  }

  // 2) Create order
  try {
    const order = await Order.create({
      user_id: userId,
      product_id: productId,
      quantity: qty,
      amount_cents: 0
    });

    // 3) Remove reservation in Redis (do NOT increment Redis stock)
    await client.del(rKey);
    await client.zRem(EXPIRY_ZSET, reservationId);
    await client.sRem(USER_RESERVATIONS(userId), reservationId);

    return order;
  } catch (err) {
    // If order creation failed, rollback DB stock decrement
    try {
      await Product.findByIdAndUpdate(productId, { $inc: { total_stock: qty } });
    } catch (rollbackErr) {
      console.error('Rollback failed after order creation failure — manual fix may be required', rollbackErr);
    }
    throw err;
  }
}

module.exports = { checkoutReservation };
