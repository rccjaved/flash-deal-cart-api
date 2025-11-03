const { validationResult } = require('express-validator');
const productService = require('../services/productService');

async function createProduct(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { sku, name, total_stock } = req.body;
    const product = await productService.createProduct({ sku, name, total_stock: Number(total_stock) });
    res.status(201).json({ product });
  } catch (err) {
    next(err);
  }
}

async function getStatus(req, res, next) {
  try {
    const id = req.params.id;
    const status = await productService.getProductStatus(id);
    res.json(status);
  } catch (err) {
    next(err);
  }
}

module.exports = { createProduct, getStatus };
