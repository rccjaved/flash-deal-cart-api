const { validationResult } = require('express-validator');
const reservationService = require('../services/reservationService');

async function reserveSingle(req, res, next) {
  try {
    const errors = validationResult(req); if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { userId, productId, qty } = req.body;
    const reservation = await reservationService.reserveSingle({ userId, productId, qty: Number(qty) });
    res.status(201).json(reservation);
  } catch (err) { next(err); }
}

async function reserveMultiple(req, res, next) {
  try {
    const { userId, items } = req.body; // items = [{productId, qty}]
    const resv = await reservationService.reserveMultiple({ userId, items });
    res.status(201).json(resv);
  } catch (err) { next(err); }
}

async function getUserReservations(req, res, next) {
  try {
    const userId = req.params.userId;
    const r = await reservationService.getUserReservations(userId);
    res.json(r);
  } catch (err) { next(err); }
}

async function cancelReservation(req, res, next) {
  try {
    const userId = req.body.userId;
    const reservationId = req.params.id;
    await reservationService.cancelReservation(userId, reservationId);
    res.json({ ok: true });
  } catch (err) { next(err); }
}

module.exports = { reserveSingle, reserveMultiple, getUserReservations, cancelReservation };
