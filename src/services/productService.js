// src/services/productService.js
const Product = require('../models/Product');
const { client } = require('../redisClient');

const STOCK_KEY = (productId) => `product:stock:${productId}`;
const TOTAL_KEY = (productId) => `product:total:${productId}`;

async function createProduct({ sku, name, total_stock }) {
  // create in Mongo
  const p = await Product.create({ sku, name, total_stock: Number(total_stock) });
  // set Redis counters (use the new Mongo id)
  await client.set(TOTAL_KEY(p._id.toString()), String(p.total_stock));
  await client.set(STOCK_KEY(p._id.toString()), String(p.total_stock));
  return p;
}

async function getProductById(id) {
  return Product.findById(id).lean();
}

async function getProductStatus(id) {
  const product = await getProductById(id);
  if (!product) throw new Error('Product not found');

  const total = Number(product.total_stock);
  const availableStr = await client.get(STOCK_KEY(id));
  const available = availableStr ? Number(availableStr) : 0;
  const reserved = total - available;
  return { total, reserved, available };
}

module.exports = { createProduct, getProductById, getProductStatus, STOCK_KEY, TOTAL_KEY };
