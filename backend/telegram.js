function parseAdminIds(raw) {
  if (!raw) return [];
  return String(raw)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => Number(s))
    .filter((n) => Number.isSafeInteger(n) && n > 0);
}

// Hardcode admins here (Telegram numeric IDs). You can still override via ADMIN_IDS env.
const HARDCODED_ADMIN_IDS = [123456789];
const envAdminIds = parseAdminIds(process.env.ADMIN_IDS);

export const ADMIN_IDS = envAdminIds.length ? envAdminIds : HARDCODED_ADMIN_IDS;

export function isAdminTelegramId(telegramId) {
  const n = Number(telegramId);
  return Number.isSafeInteger(n) && ADMIN_IDS.includes(n);
}

export async function notifyAdminsNewOrder({
  botToken,
  orderId,
  username,
  telegramId,
  itemTitle,
  price,
  currency = "Ks",
  transactionLast6,
}) {
  if (!botToken) throw new Error("Missing BOT_TOKEN");
  if (!ADMIN_IDS.length) return;

  const safeUsername = username ? `@${username}` : `(id: ${telegramId})`;
  const text =
    `🛒 New Order\n` +
    `User: ${safeUsername}\n` +
    `Item: ${itemTitle}\n` +
    `Price: ${price} ${currency}\n` +
    `Transaction: ${transactionLast6}\n` +
    `OrderID: ${orderId}`;

  const reply_markup = {
    inline_keyboard: [
      [
        { text: "✅ Confirm", callback_data: `confirm_${orderId}` },
        { text: "❌ Cancel", callback_data: `cancel_${orderId}` },
      ],
    ],
  };

  await Promise.all(
    ADMIN_IDS.map(async (chatId) => {
      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          reply_markup,
          disable_web_page_preview: true,
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Failed to notify admin ${chatId}: ${res.status} ${body}`);
      }
    })
  );
}

