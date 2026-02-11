# Delivery Charge Update (2026-02-10)

Goal
Fixed/first-km charge + per-km charge. Distance is rounded up to the next km. User free-delivery logic stays the same (user pays 0 if `freeDeliveryLimit` hit, driver still gets paid).

Formula
- `distanceKm = distanceMeters / 1000`
- `billableKm = Math.max(1, Math.ceil(distanceKm))`
- `deliveryChargeRaw = fixedFirstKm + perKm * (billableKm - 1)`
- `deliveryPayout = deliveryChargeRaw / (1 + deliveryGstPercent / 100)`

Examples
- `distance=3.1km` -> `billableKm=4` -> `20 + 10 + 10 = 40`
- `distance=3.9km` -> `billableKm=4` -> `20 + 10 + 10 = 40`

Page-wise changes (no API change)

**modals/setting.js**
- Add `Delivery_First_Km_Charge` (Number). This is the fixed/first-km charge.
- Add `Delivery_Per_Km_Charge` (Number). This is the charge for each km after the first.
- Keep `Delivery_Charges` as a fallback for older configs.

**modals/order.js**
- Add `deliveryDistanceKm` to `Order` and `TempOrder` so the distance used for billing is stored per order.

**controlers/orderControler.js** (to do)
- Use `haversine-distance` only (no Google API).
- Convert meters to km, apply `Math.ceil`, and compute `deliveryChargeRaw`.
- Save `deliveryDistanceKm` on both `Order` (COD) and `TempOrder` (online).
- Apply `freeDeliveryLimit`: if items total >= limit, set `deliveryCharges = 0` but keep `deliveryPayout` from the computed raw charge.

**controlers/driverControler.js** (to do)
- In `driverWallet`, use `order.deliveryPayout` directly (fallback only if missing).
- Do not recalculate driver payout from global settings once per-order values exist.

**utils/deliveryCharge helper** (to do)
- Use `haversine-distance` only (no Google API).
- Provide helpers for meters → km, billable km, and charge calculation.
- Keep logic reusable so `orderControler` is clean.

Notes
- Admin settings update API can remain the same; just include the new fields in the payload.
- Existing invoices use `order.deliveryCharges`, so no invoice code change is required.

getCart API (delivery charges) code reference (haversine only)
```js
// additions inside getCart (cartControler.js)
const Address = require("../modals/Address");
const { SettingAdmin } = require("../modals/setting");
const haversine = require("haversine-distance");
const {
  getDistanceKm,
  getBillableKm,
  computeDeliveryCharge,
} = require("../utils/deliveryCharge");

// inside exports.getCart = async (req, res) => { ... }
const settings = await SettingAdmin.findOne().lean();
let address = null;

// BEFORE: no delivery charge or distance data in getCart response
// AFTER: find user's default address and compute delivery charges for it
address = await Address.findOne({
  userId: id,
  default: true,
  isDeleted: { $ne: true },
}).lean();
if (!address) {
  address = await Address.findOne({
    userId: id,
    isDeleted: { $ne: true },
  })
    .sort({ createdAt: -1 })
    .lean();
}

let deliveryChargeRaw = 0;
let deliveryDistanceKm = 0;
let billableKm = 0;
let isFreeDelivery = false;

if (address && items?.length) {
  const storeId = items[0].storeId;
  const store = await Store.findById(storeId, {
    Latitude: 1,
    Longitude: 1,
  }).lean();

  const distanceMeters = Math.round(
    haversine(
      { lat: parseFloat(address?.latitude), lon: parseFloat(address?.longitude) },
      { lat: parseFloat(store?.Latitude), lon: parseFloat(store?.Longitude) }
    )
  );

  deliveryDistanceKm = Number(getDistanceKm(distanceMeters).toFixed(2));
  billableKm = getBillableKm(distanceMeters);

  const fixedFirstKm =
    settings?.Delivery_First_Km_Charge ?? settings?.Delivery_Charges ?? 0;
  const perKm = settings?.Delivery_Per_Km_Charge ?? 0;

  deliveryChargeRaw = computeDeliveryCharge({
    distanceMeters,
    fixedFirstKm,
    perKm,
  });

  const itemsTotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  // freeDeliveryLimit applies to USER only
  if (itemsTotal >= (settings?.freeDeliveryLimit || 0)) {
    deliveryChargeRaw = 0;
    isFreeDelivery = true;
  }
}

return res.status(200).json({
  status: true,
  message: "Cart items fetched successfully.",
  items: updatedItems,
  paymentOption: cashOnDelivery,
  StoreID: storeId,
  deliveryChargeRaw,
  deliveryDistanceKm,
  billableKm,
  isFreeDelivery,
});
```
