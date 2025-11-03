// src/models/Order.js
const { Schema, model, Types } = require('mongoose');

const orderSchema = new Schema({
  user_id: { type: String, required: true },
  product_id: { type: Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true },
  amount_cents: { type: Number, default: 0 },
}, { timestamps: { createdAt: 'created_at' } });

module.exports = model('Order', orderSchema);
