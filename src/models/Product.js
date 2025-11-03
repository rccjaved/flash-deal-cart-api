// src/models/Product.js
const { Schema, model } = require('mongoose');

const productSchema = new Schema({
  sku: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  total_stock: { type: Number, default: 0, required: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = model('Product', productSchema);
