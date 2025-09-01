const Counter = require('../modals/counter');

async function getNextOrderId() {
  const counter = await Counter.findOneAndUpdate(
    { _id: 'orderId' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  return `OID${counter.seq.toString().padStart(3, '0')}`;
}

module.exports = { getNextOrderId };