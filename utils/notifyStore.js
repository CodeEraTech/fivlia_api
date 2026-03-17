const admin = require("../firebase/firebase");

/**
 * Universal push sender for store/seller/driver notifications.
 * Automatically cleans invalid tokens.
 */
exports.notifyEntity = async (entityDoc, title, body, data = {}) => {
  try {
    if (!entityDoc?.devices?.length) {
      console.log(`ℹ️ No device list found for entity ${entityDoc?._id}`);
      return;
    }

    // 1️⃣ Filter valid tokens
    const tokens = entityDoc.devices
      .map((d) => d.fcmToken)
      .filter((t) => typeof t === "string" && t.trim() !== "");

    if (tokens.length === 0) {
      console.log(`ℹ️ No valid FCM tokens for entity ${entityDoc._id}`);
      return;
    }

    // 2️⃣ Prepare FCM message
    const message = {
      notification: { title, body },
      android: {
        notification: {
          channelId: "default_channel",
          sound: "default",
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            alert: { title, body },
          },
        },
      },
      data,
    };

    // 3️⃣ Send to all tokens in parallel
    const results = await Promise.allSettled(
      tokens.map((token) => admin.messaging().send({ ...message, token }))
    );

    // 4️⃣ Detect invalid tokens and remove them
    const invalidTokens = [];
    results.forEach((r, i) => {
      if (r.status === "fulfilled") {
        console.log(`✅ Push sent to device ${i + 1}`);
      } else {
        console.warn(`⚠️ Push failed for device ${i + 1}:`, r.reason?.errorInfo?.code);
        if (r.reason?.errorInfo?.code === "messaging/registration-token-not-registered") {
          invalidTokens.push(tokens[i]);
        }
      }
    });

    if (invalidTokens.length > 0) {
      entityDoc.devices = entityDoc.devices.filter(
        (d) => !invalidTokens.includes(d.fcmToken)
      );
      await entityDoc.save();
      console.log(`🧹 Removed ${invalidTokens.length} invalid tokens from ${entityDoc._id}`);
    }
  } catch (err) {
    console.error(`❌ notifyEntity error for ${entityDoc?._id}:`, err);
  }
};
