-- Supabase schema for Telegram Mini App store
-- Run this in Supabase SQL Editor.

create extension if not exists "pgcrypto";

-- USERS
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  telegram_id text not null unique,
  username text,
  role text not null default 'user' check (role in ('admin', 'user'))
);

-- PRODUCTS (digital products / subscriptions)
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  duration text not null,
  price numeric not null check (price > 0)
);

-- GAME CURRENCY OPTIONS
create table if not exists public.game_options (
  id uuid primary key default gen_random_uuid(),
  game_name text not null,
  amount text not null,
  price numeric not null check (price > 0)
);

-- ORDERS
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  telegram_id text not null,
  product_name text not null,
  amount text,
  price numeric not null check (price > 0),
  transaction_last6 text not null check (transaction_last6 ~ '^[0-9]{6}$'),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled')),
  created_at timestamptz not null default now()
);

create index if not exists orders_telegram_id_idx on public.orders (telegram_id);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists game_options_game_name_idx on public.game_options (game_name);

-- Seed examples (edit to your real catalog)
insert into public.products (name, category, duration, price)
values
  ('Netflix Premium', 'Streaming', '1 month', 12000),
  ('Netflix Premium', 'Streaming', '3 months', 32000),
  ('Spotify Premium', 'Streaming', '1 month', 8000),
  ('ChatGPT Plus', 'AI', '1 month', 25000)
on conflict do nothing;

insert into public.game_options (game_name, amount, price)
values
  ('Mobile Legends', '60 Diamonds', 1800),
  ('Mobile Legends', '120 Diamonds', 3500),
  ('PUBG', '60 UC', 2500),
  ('PUBG', '120 UC', 4800),
  ('Free Fire', '100 Diamonds', 2200),
  ('Free Fire', '210 Diamonds', 4200)
on conflict do nothing;

