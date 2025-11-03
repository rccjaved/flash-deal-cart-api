const checkoutService = require('../services/checkoutService');

async function checkout(req, res, next) {
  try {
    const { userId, reservationId } = req.body;
    const order = await checkoutService.checkoutReservation(userId, reservationId);
    res.json({ order });
  } catch (err) { next(err); }
}

module.exports = { checkout };
