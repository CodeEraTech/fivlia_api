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
    return `FIV${counter.seq}`;
  } else {
    const counter = await Counter.findById('feeInvoiceId');
    const seq = counter ? counter.seq + 1 : 1;
    return `FIV${seq}`;
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


async function generateSKU() {
  const counter = await Counter.findOneAndUpdate(
    { _id: "product_sku" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  return `FIV${String(counter.seq).padStart(3, "0")}`;
}

async function getNextCategoryId(increment = true) {
  const counter = await Counter.findOneAndUpdate(
    { _id: 'categoryId' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  return `CAT${String(counter.seq).padStart(2, "0")}`;
}

async function getNextSubCategoryId(increment = true) {
  const counter = await Counter.findOneAndUpdate(
    { _id: 'subCategoryId' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  return `SUB${String(counter.seq).padStart(2, "0")}`;
}

async function getNextSubbCategoryId(increment = true) {
  const counter = await Counter.findOneAndUpdate(
    { _id: 'subSubCategoryId' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  return `SUBB${String(counter.seq).padStart(2, "0")}`;
}

async function getNextBrandId(increment = true) {
  const counter = await Counter.findOneAndUpdate(
    { _id: 'brandId' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  return `BRD${String(counter.seq).padStart(2, "0")}`;
}

module.exports = { getNextOrderId,FeeInvoiceId,requestId,getNextDriverId,generateSKU,getNextCategoryId,getNextSubCategoryId,getNextSubbCategoryId,getNextBrandId };
