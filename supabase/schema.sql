-- Shared Hour Schedule — run once in the Supabase SQL editor.

create table if not exists allowed_members (
  email text primary key check (email = lower(email)),
  display_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists absences (
  id uuid primary key default gen_random_uuid(),
  email text not null references allowed_members (email) on delete cascade,
  date date not null,
  reason text not null check (char_length(reason) between 1 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (email, date)
);

create table if not exists signups (
  id uuid primary key default gen_random_uuid(),
  email text not null references allowed_members (email) on delete cascade,
  date date not null,
  note text not null default '' check (char_length(note) <= 500),
  invited_email text references allowed_members (email) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (email, date)
);

alter table allowed_members enable row level security;
alter table absences enable row level security;
alter table signups enable row level security;

create policy "members readable by authenticated"
  on allowed_members for select to authenticated using (true);

create policy "absences readable by authenticated"
  on absences for select to authenticated using (true);

create policy "insert own absences" on absences for insert to authenticated
  with check (email = lower(auth.jwt() ->> 'email'));

create policy "update own absences" on absences for update to authenticated
  using (email = lower(auth.jwt() ->> 'email'));

create policy "delete own absences" on absences for delete to authenticated
  using (email = lower(auth.jwt() ->> 'email'));

create policy "signups readable by authenticated"
  on signups for select to authenticated using (true);

create policy "insert own signups" on signups for insert to authenticated
  with check (email = lower(auth.jwt() ->> 'email'));

create policy "update own signups" on signups for update to authenticated
  using (email = lower(auth.jwt() ->> 'email'));

create policy "delete own signups" on signups for delete to authenticated
  using (email = lower(auth.jwt() ->> 'email'));
