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

async function FeeInvoiceId(increment = true) {
  if (increment) {
    const counter = await Counter.findOneAndUpdate(
      { _id: 'feeInvoiceId' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    return `FIV${counter.seq.toString().padStart(3, '0')}`;
  } else {
    const counter = await Counter.findById('feeInvoiceId');
    const seq = counter ? counter.seq + 1 : 1;
    return `FIV${seq.toString().padStart(3, '0')}`;
  }
}


async function requestId(increment = true) {
  if (increment) {
    const counter = await Counter.findOneAndUpdate(
      { _id: 'requestId' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    return `REQ${counter.seq.toString().padStart(3, '0')}`;
  } else {
    const counter = await Counter.findById('feeInvoiceId');
    const seq = counter ? counter.seq + 1 : 1;
    return `REQ${seq.toString().padStart(3, '0')}`;
  }
}

async function getNextDriverId(increment = true) {
  if (increment) {
    const counter = await Counter.findOneAndUpdate(
      { _id: 'driverId' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    return `FV${counter.seq.toString().padStart(3, '0')}`;
  } else {
    const counter = await Counter.findById('orderId');
    const seq = counter ? counter.seq + 1 : 1;
    return `FV${seq.toString().padStart(3, '0')}`;
  }
}

module.exports = { getNextOrderId,FeeInvoiceId,requestId,getNextDriverId };
