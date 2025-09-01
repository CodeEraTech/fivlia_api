const Counter = require('../modals/counter');

async function getNextOrderId() {
  const counter = await Counter.findByIdAndUpdate(
    { _id: 'orderId' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  return `OID${counter.seq.toString().padStart(3, '0')}`;
}
