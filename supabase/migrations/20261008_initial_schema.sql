-- Run this in the Supabase SQL Editor after creating the project.
-- All database access flows through the Render backend using the service-role key.

create table if not exists public.users (
  _id text primary key,
  email text unique,
  name text
);

create table if not exists public.customers (
  _id text primary key,
  user_id uuid not null,
  name text not null,
  email text not null,
  recency double precision not null,
  frequency double precision not null,
  monetary double precision not null,
  avg_order_value double precision not null,
  purchases_per_month double precision not null,
  prediction_label text,
  email_status text not null default 'Not Sent',
  created_at timestamptz not null default now(),
  unique (user_id, email)
);

create table if not exists public.user_metrics (
  user_id uuid primary key,
  total_customers integer not null,
  total_revenue double precision not null,
  total_transactions integer not null,
  date_range text,
  updated_at timestamptz not null default now()
);

alter table public.users enable row level security;
alter table public.customers enable row level security;
alter table public.user_metrics enable row level security;
