-- Fridge Freezer Organizer - Initial Schema
-- Run this in your Supabase SQL editor or via supabase db push

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================
-- HOUSEHOLDS
-- ============================================
create table public.households (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_by uuid references auth.users(id) on delete set null,
  invite_code text unique not null default substr(md5(random()::text), 1, 8),
  created_at timestamptz default now()
);

-- ============================================
-- HOUSEHOLD MEMBERS
-- ============================================
create table public.household_members (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid references public.households(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text check (role in ('owner', 'member')) default 'member',
  joined_at timestamptz default now(),
  unique(household_id, user_id)
);

-- ============================================
-- FOOD ITEMS
-- ============================================
create table public.food_items (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid references public.households(id) on delete cascade not null,
  name text not null,
  category text check (category in (
    'dairy', 'meat', 'poultry', 'seafood', 'produce', 'grains',
    'beverages', 'condiments', 'leftovers', 'frozen_meals', 'snacks', 'other'
  )) not null default 'other',
  location text check (location in ('fridge', 'freezer', 'pantry')) not null default 'fridge',
  quantity numeric not null default 1,
  unit text not null default 'item',
  added_date date not null default current_date,
  expiry_date date not null,
  opened boolean default false,
  opened_date date,
  notes text,
  barcode text,
  shelf text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger food_items_updated_at
  before update on public.food_items
  for each row execute function update_updated_at();

-- ============================================
-- WASTE LOGS
-- ============================================
create table public.waste_logs (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid references public.households(id) on delete cascade not null,
  item_name text not null,
  category text check (category in (
    'dairy', 'meat', 'poultry', 'seafood', 'produce', 'grains',
    'beverages', 'condiments', 'leftovers', 'frozen_meals', 'snacks', 'other'
  )) not null,
  quantity numeric not null default 1,
  unit text not null default 'item',
  reason text check (reason in ('expired', 'spoiled', 'leftover', 'other')) not null,
  estimated_cost numeric not null default 0,
  wasted_date date not null default current_date,
  created_at timestamptz default now()
);

-- ============================================
-- NOTIFICATION PREFERENCES
-- ============================================
create table public.notification_preferences (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  days_before_expiry integer not null default 2,
  enabled boolean default true,
  created_at timestamptz default now()
);

-- ============================================
-- INDEXES
-- ============================================
create index idx_food_items_household on public.food_items(household_id);
create index idx_food_items_expiry on public.food_items(expiry_date);
create index idx_food_items_location on public.food_items(location);
create index idx_food_items_barcode on public.food_items(barcode);
create index idx_waste_logs_household on public.waste_logs(household_id);
create index idx_waste_logs_date on public.waste_logs(wasted_date);
create index idx_household_members_user on public.household_members(user_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.food_items enable row level security;
alter table public.waste_logs enable row level security;
alter table public.notification_preferences enable row level security;

-- Users can read households they belong to
create policy "Users can view their households"
  on public.households for select
  using (id in (
    select household_id from public.household_members
    where user_id = auth.uid()
  ));

-- Users can create households
create policy "Users can create households"
  on public.households for insert
  with check (created_by = auth.uid());

-- Members can view membership of their households
create policy "Members can view household members"
  on public.household_members for select
  using (household_id in (
    select household_id from public.household_members
    where user_id = auth.uid()
  ));

-- Owners can manage members
create policy "Owners can insert members"
  on public.household_members for insert
  with check (
    household_id in (
      select household_id from public.household_members
      where user_id = auth.uid() and role = 'owner'
    ) or user_id = auth.uid()
  );

-- Food items: members can CRUD items in their household
create policy "Members can view food items"
  on public.food_items for select
  using (household_id in (
    select household_id from public.household_members
    where user_id = auth.uid()
  ));

create policy "Members can insert food items"
  on public.food_items for insert
  with check (household_id in (
    select household_id from public.household_members
    where user_id = auth.uid()
  ));

create policy "Members can update food items"
  on public.food_items for update
  using (household_id in (
    select household_id from public.household_members
    where user_id = auth.uid()
  ));

create policy "Members can delete food items"
  on public.food_items for delete
  using (household_id in (
    select household_id from public.household_members
    where user_id = auth.uid()
  ));

-- Waste logs: same household-based access
create policy "Members can view waste logs"
  on public.waste_logs for select
  using (household_id in (
    select household_id from public.household_members
    where user_id = auth.uid()
  ));

create policy "Members can insert waste logs"
  on public.waste_logs for insert
  with check (household_id in (
    select household_id from public.household_members
    where user_id = auth.uid()
  ));

-- Notification prefs: user can manage their own
create policy "Users manage own notification prefs"
  on public.notification_preferences for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
