const Counter = require('../modals/counter');

async function getNextOrderId(increment = true) {
  if (increment) {
    const counter = await Counter.findOneAndUpdate(
      { _id: 'orderId' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    return `OID${counter.seq.toString().padStart(3, '0')}`;
  } else {
    const counter = await Counter.findById('orderId');
    const seq = counter ? counter.seq + 1 : 1;
    return `OID${seq.toString().padStart(3, '0')}`;
  }
}

module.exports = { getNextOrderId };
