-- Weekend opt-in sign-ups: on weekends nobody is expected, you sign up if you
-- want to work. Optionally invite a teammate to join you.

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

alter table signups enable row level security;

create policy "signups readable by authenticated"
  on signups for select to authenticated using (true);

create policy "insert own signups" on signups for insert to authenticated
  with check (email = lower(auth.jwt() ->> 'email'));

create policy "update own signups" on signups for update to authenticated
  using (email = lower(auth.jwt() ->> 'email'));

create policy "delete own signups" on signups for delete to authenticated
  using (email = lower(auth.jwt() ->> 'email'));
