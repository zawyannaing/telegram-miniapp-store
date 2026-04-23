import express from "express";
import { supabase } from "../supabase.js";
import { notifyAdminsNewOrder } from "../telegram.js";
import { isSixDigits, requireNonEmptyString } from "../validate.js";

export const orderRouter = express.Router();

orderRouter.post("/", async (req, res) => {
  const {
    telegram_id,
    username,
    item_type,
    product_id,
    product_name,
    duration,
    game_name,
    amount,
    price,
    transaction_last6,
  } = req.body ?? {};

  if (!requireNonEmptyString(telegram_id)) {
    return res.status(400).json({ error: "telegram_id is required" });
  }
  if (!requireNonEmptyString(product_name)) {
    return res.status(400).json({ error: "product_name is required" });
  }
  if (!Number.isFinite(Number(price)) || Number(price) <= 0) {
    return res.status(400).json({ error: "price must be a positive number" });
  }
  if (!isSixDigits(String(transaction_last6 ?? ""))) {
    return res.status(400).json({ error: "transaction_last6 must be exactly 6 digits" });
  }

  const safeUsername = requireNonEmptyString(username) ? username.trim() : null;

  const { error: upsertUserError } = await supabase.from("users").upsert(
    {
      telegram_id: String(telegram_id),
      username: safeUsername,
      role: "user",
    },
    { onConflict: "telegram_id" }
  );
  if (upsertUserError) return res.status(500).json({ error: "Failed to save user" });

  const itemTitle = (() => {
    if (item_type === "game") {
      const game = requireNonEmptyString(game_name) ? game_name.trim() : "Game";
      const amt = requireNonEmptyString(amount) ? amount.trim() : "";
      return `${game} ${amt}`.trim();
    }
    const d = requireNonEmptyString(duration) ? ` (${duration.trim()})` : "";
    return `${product_name}${d}`.trim();
  })();

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      telegram_id: String(telegram_id),
      product_name: String(product_name),
      amount: requireNonEmptyString(amount) ? String(amount) : null,
      price: Number(price),
      transaction_last6: String(transaction_last6),
      status: "pending",
    })
    .select("id")
    .single();

  if (orderError) return res.status(500).json({ error: "Failed to create order" });

  try {
    await notifyAdminsNewOrder({
      botToken: process.env.BOT_TOKEN,
      orderId: order.id,
      username: safeUsername,
      telegramId: telegram_id,
      itemTitle,
      price: Number(price),
      transactionLast6: String(transaction_last6),
    });
  } catch (e) {
    return res.status(201).json({
      ok: true,
      order_id: order.id,
      warning: "Order created, but failed to notify admin bot",
    });
  }

  return res.status(201).json({ ok: true, order_id: order.id });
});

