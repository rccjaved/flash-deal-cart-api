// src/scripts/seed.js
require('dotenv').config();
const { connectMongo, mongoose } = require('../db/mongo');
const { client, connect: connectRedis } = require('../redisClient');
const Product = require('../models/Product');
const Order = require('../models/Order');

// Keys used by your app
const STOCK_KEY = (productId) => `product:stock:${productId}`;
const TOTAL_KEY = (productId) => `product:total:${productId}`;

async function run() {
  const mongoUri = process.env.MONGODB_URI;
  const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

  if (!mongoUri) {
    console.error('Please set MONGODB_URI in your .env or environment.');
    process.exit(1);
  }

  try {
    // connect to Mongo
    await connectMongo(mongoUri);

    // connect redis (ensure redis client uses REDIS_URL from env; override here)
    process.env.REDIS_URL = redisUrl;
    await connectRedis();

    // Clear existing small sample (optional)
    await Product.deleteMany({});
    await Order.deleteMany({});

    // Create 3 products
    const products = await Product.create([
      { sku: 'FLASH-RED-001', name: 'Flash T-Shirt - Red', total_stock: 50 },
      { sku: 'FLASH-BLU-002', name: 'Flash T-Shirt - Blue', total_stock: 30 },
      { sku: 'FLASH-HAT-003', name: 'Flash Cap', total_stock: 20 },
    ]);

    // Initialize redis counters for each product
    for (const p of products) {
      const id = p._id.toString();
      await client.set(TOTAL_KEY(id), String(p.total_stock));
      await client.set(STOCK_KEY(id), String(p.total_stock));
    }

    // Create 1 sample order (consume stock in DB)
    const sampleProduct = products[0];
    const orderQty = 2;
    // Decrement product total_stock in DB
    sampleProduct.total_stock = sampleProduct.total_stock - orderQty;
    await sampleProduct.save();

    const order = await Order.create({
      user_id: 'seed-user-1',
      product_id: sampleProduct._id,
      quantity: orderQty,
      amount_cents: 0
    });

    console.log('=== Seed complete ===');
    console.log('Products inserted:');
    products.forEach(p => {
      console.log({
        id: p._id.toString(),
        sku: p.sku,
        name: p.name,
        total_stock: p.total_stock
      });
    });

    console.log('Sample order created:');
    console.log({
      id: order._id.toString(),
      user_id: order.user_id,
      product_id: order.product_id.toString(),
      quantity: order.quantity
    });

    // Print status from Redis for easy copy/paste
    console.log('\nRedis keys initialized (product:total and product:stock). Example lookup:');
    console.log(`KEY EXAMPLE -> product:stock:${products[0]._id.toString()}`);
    console.log('You can now use these product IDs in Postman as productId.');

    await mongoose.disconnect();
    await client.quit();
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    try { await client.quit(); } catch {}
    try { await mongoose.disconnect(); } catch {}
    process.exit(1);
  }
}

run();
