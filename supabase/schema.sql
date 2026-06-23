-- Collade AI Supabase schema
-- Run this in the Supabase SQL editor

create extension if not exists "uuid-ossp";

create table if not exists user_credits (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  user_id uuid references auth.users(id),
  created_by text,
  balance integer not null default 0,
  plan text not null default 'free',
  access_locked boolean default false,
  welcome_shown boolean default false,
  subscription_start timestamptz,
  subscription_expiry timestamptz,
  razorpay_payment_id text
);

create table if not exists user_skill (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  user_id uuid references auth.users(id),
  created_by text,
  skill_name text not null,
  status text not null default 'learning',
  points integer default 0,
  category text
);

create table if not exists user_achievement (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  user_id uuid references auth.users(id),
  created_by text,
  badges text[] default '{}',
  total_points integer default 0,
  skills_completed integer default 0,
  simulations_run integer default 0,
  career_paths_explored integer default 0,
  level text default 'Explorer'
);

create table if not exists mentor_post (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  user_id uuid references auth.users(id),
  created_by text,
  question text not null,
  ai_answer text,
  mentor_response text,
  author_name text,
  topic text,
  likes integer default 0
);

create table if not exists post_reply (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  user_id uuid references auth.users(id),
  created_by text,
  post_id uuid references mentor_post(id) on delete cascade,
  author_name text,
  content text not null,
  likes integer default 0
);

alter table user_credits enable row level security;
alter table user_skill enable row level security;
alter table user_achievement enable row level security;
alter table mentor_post enable row level security;
alter table post_reply enable row level security;

create policy "Users manage own credits" on user_credits for all using (auth.uid() = user_id);
create policy "Users manage own skills" on user_skill for all using (auth.uid() = user_id);
create policy "Users manage own achievements" on user_achievement for all using (auth.uid() = user_id);
create policy "Anyone can read mentor posts" on mentor_post for select using (true);
create policy "Authenticated users create mentor posts" on mentor_post for insert with check (auth.uid() = user_id);
create policy "Users update own mentor posts" on mentor_post for update using (auth.uid() = user_id);
create policy "Anyone can read post replies" on post_reply for select using (true);
create policy "Users create post replies" on post_reply for insert with check (auth.uid() = user_id);
create policy "Users update own post replies" on post_reply for update using (auth.uid() = user_id);
