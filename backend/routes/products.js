import express from "express";
import { supabase } from "../supabase.js";

export const productsRouter = express.Router();

productsRouter.get("/", async (_req, res) => {
  const { data, error } = await supabase
    .from("products")
    .select("id,name,category,duration,price")
    .order("category", { ascending: true })
    .order("price", { ascending: true });

  if (error) return res.status(500).json({ error: "Failed to load products" });
  return res.json({ products: data ?? [] });
});

