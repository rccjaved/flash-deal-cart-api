# ⚡ Flash Deal Cart Reservation & Checkout API

A backend API that manages flash deal product reservations using **Node.js**, **Express**, and **Redis** to ensure no overselling during high concurrency.

---

## 🚀 How to Start the Project

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/rccjaved/flash-deal-cart-api.git
cd <your-repo-name>

2️⃣ Install Dependencies

npm install


3️⃣ Start Redis

Make sure Redis is installed and running.
If you’re using Docker Desktop, run:

docker run -d --name redis-server -p 6379:6379 redis


4️⃣ Start the Server

npm start


The API will run at: http://localhost:3000


🧰 Tech Stack Choices
                                  
Backend Framework	                      Node.js + Express
Database	                              MongoDB (Mongoose)
Cache / Reservation	                    Redis
API Documentation	                      Postman Collection
Concurrency Handling	                  Redis Atomic Counters & Locks
Expiry Handling	                        Redis TTL





🧩 API Endpoints
Method	           Endpoint	                        Description
POST	             /api/products	                  Create product (save to DB + initialize Redis stock counters)
POST	             /api/reserve	                    Reserve a single product for 10 minutes
POST	             /api/reserve-multiple	          Reserve multiple SKUs (all-or-nothing)
POST	             /api/checkout	                  Finalize checkout (reduce permanent DB stock)
POST	             /api/cancel	                    Cancel reservation manually
GET 	             /api/product/:sku	              Get product stock status (total/reserved/available)





⚙️ How Reservation Lock Logic Works


1) When a user reserves a product:

   . Redis DECRBY temporarily reduces the available stock counter.

   . A Redis key like reservation:<userId>:<sku> is created with a TTL = 600 seconds (10 min).

2) If reservation succeeds:

   . That stock is locked for that user until checkout or expiry.

3) If the user cancels or TTL expires:

 . Redis automatically increments the available stock counter (released back to inventory).

4) This ensures no overselling and correct concurrency behavior.


⏱️ How Expiration Works

Each reservation is stored in Redis with a 10-minute TTL.

After 10 minutes, the key expires automatically, triggering stock restoration.

Checkout before expiry converts the reservation into a confirmed order and updates MongoDB.


🧪 Postman Collection

This is available in root folder:
📂 FlashDeal-API.postman_collection.json


