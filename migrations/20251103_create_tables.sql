CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  total_stock INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  product_id INT NOT NULL REFERENCES products(id),
  quantity INT NOT NULL,
  amount_cents INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT now()
);

-- Optional: add index
CREATE INDEX idx_products_sku ON products(sku);
