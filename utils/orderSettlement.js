const driver = require("../modals/driver");
const Store = require("../modals/store");
const { SettingAdmin } = require("../modals/setting");
const admin_transaction = require("../modals/adminTranaction");
const store_transaction = require("../modals/storeTransaction");
const Transaction = require("../modals/driverModals/transaction");
const { toNumber } = require("./sellerDelivery");

const ADMIN_WALLET_ID = "68ea20d2c05a14a96c12788d";

const calculateItemTotal = (items = []) => {
  return items.reduce(
    (sum, item) => sum + toNumber(item?.price) * toNumber(item?.quantity),
    0,
  );
};

const calculateTotalCommission = (items = []) => {
  return items.reduce((sum, item) => {
    const itemTotal = toNumber(item?.price) * toNumber(item?.quantity);
    const commissionAmount = (toNumber(item?.commision) / 100) * itemTotal;
    return sum + commissionAmount;
  }, 0);
};

const buildStoreCreditDescription = ({
  store,
  totalCommission,
  foodSellerTaxAmount,
  sellerSponsoredDeliveryPayout,
}) => {
  const commissionText = totalCommission.toFixed(2);
  const foodTaxText = foodSellerTaxAmount.toFixed(2);
  const deliveryText = sellerSponsoredDeliveryPayout.toFixed(2);

  let description = store?.Authorized_Store
    ? "Full amount credited (Authorized Store)"
    : foodSellerTaxAmount > 0
      ? `Credited after commission + food seller tax cut (${commissionText} commission and ${foodTaxText} tax deducted)`
      : `Credited after commission cut (${commissionText} deducted)`;

  if (sellerSponsoredDeliveryPayout > 0) {
    description += ` and seller-funded delivery payout cut (${deliveryText} deducted)`;
  }

  return description;
};

const creditAdminWallet = async ({ amount, orderId, description }) => {
  if (amount <= 0) return null;

  const lastAmount = await admin_transaction.findById(ADMIN_WALLET_ID).lean();
  const updatedWallet = await admin_transaction.findByIdAndUpdate(
    ADMIN_WALLET_ID,
    { $inc: { wallet: amount } },
    { new: true },
  );

  await admin_transaction.create({
    currentAmount: updatedWallet.wallet,
    lastAmount: lastAmount?.wallet || 0,
    type: "Credit",
    amount,
    orderId,
    description,
  });

  return updatedWallet;
};

const settleDeliveredOrder = async ({ order }) => {
  const storeBefore = await Store.findById(order.storeId).lean();
  if (!storeBefore) {
    throw new Error("Store not found during delivery settlement");
  }

  const setting = await SettingAdmin.findOne().lean();
  const itemTotal = calculateItemTotal(order.items);
  const totalCommission = calculateTotalCommission(order.items);

  const isFoodSellerTaxApplicable =
    !storeBefore.Authorized_Store &&
    (storeBefore?.sellFood === true ||
      String(storeBefore?.businessType || "")
        .trim()
        .toUpperCase() === "FSSAI");

  const foodSellerTaxPercent = Number(setting?.foodSellerTaxPercent || 5);
  const foodSellerTaxAmount = isFoodSellerTaxApplicable
    ? (itemTotal * foodSellerTaxPercent) / 100
    : 0;

  const totalAdminDeduction = storeBefore.Authorized_Store
    ? 0
    : totalCommission + foodSellerTaxAmount;
  const sellerSponsoredDeliveryPayout = Math.max(
    0,
    toNumber(order?.sellerSponsoredDeliveryPayout),
  );

  let creditToStore = itemTotal;
  if (!storeBefore.Authorized_Store) {
    creditToStore = itemTotal - totalAdminDeduction;
  }
  creditToStore -= sellerSponsoredDeliveryPayout;

  const storeData = await Store.findByIdAndUpdate(
    order.storeId,
    { $inc: { wallet: creditToStore } },
    { new: true },
  );

  await store_transaction.create({
    currentAmount: storeData.wallet,
    lastAmount: storeBefore.wallet || 0,
    type: "Credit",
    amount: creditToStore,
    orderId: order.orderId,
    storeId: order.storeId,
    description: buildStoreCreditDescription({
      store: storeBefore,
      totalCommission,
      foodSellerTaxAmount,
      sellerSponsoredDeliveryPayout,
    }),
  });

  if (!storeBefore.Authorized_Store && totalAdminDeduction > 0) {
    await creditAdminWallet({
      amount: totalAdminDeduction,
      orderId: order.orderId,
      description:
        foodSellerTaxAmount > 0
          ? "Commission and food seller tax credited to Admin wallet"
          : "Commission credited to Admin wallet",
    });
  }

  const payout = Math.max(0, toNumber(order?.deliveryPayout));
  const deliveryChargeRaw = Math.max(0, toNumber(order?.deliveryCharges));
  const taxedAmount = Math.max(0, deliveryChargeRaw - payout);

  let updatedDriver = null;
  if (payout > 0 && order?.driver?.mobileNumber) {
    updatedDriver = await driver.findOneAndUpdate(
      { "address.mobileNo": order.driver.mobileNumber },
      { $inc: { wallet: payout } },
      { new: true },
    );

    if (updatedDriver) {
      await Transaction.create({
        driverId: updatedDriver._id,
        type: "credit",
        amount: payout,
        orderId: order._id,
        description: `Payout for Order #${order.orderId}`,
      });
    }
  }

  if (taxedAmount > 0) {
    await creditAdminWallet({
      amount: taxedAmount,
      orderId: order.orderId,
      description: "Delivery Charge GST credited to Admin wallet",
    });
  }

  return {
    storeBefore,
    storeData,
    updatedDriver,
    settlement: {
      itemTotal,
      totalCommission,
      foodSellerTaxPercent,
      foodSellerTaxAmount,
      sellerSponsoredDeliveryPayout,
      creditToStore,
      payout,
      taxedAmount,
    },
  };
};

module.exports = {
  settleDeliveredOrder,
};
