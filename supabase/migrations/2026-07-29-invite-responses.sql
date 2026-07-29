-- Weekend invites become first-class: each invite tracks pending/accepted/declined
-- so the invited person can respond from their own board.

create table if not exists signup_invites (
  id uuid primary key default gen_random_uuid(),
  signup_id uuid not null references signups (id) on delete cascade,
  email text not null references allowed_members (email) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (signup_id, email)
);

alter table signup_invites enable row level security;

create policy "invites readable by authenticated"
  on signup_invites for select to authenticated using (true);

create policy "respond to own invites" on signup_invites for update to authenticated
  using (email = lower(auth.jwt() ->> 'email'));

-- Carry over invites stored as plain email arrays, then retire the column.
insert into signup_invites (signup_id, email)
  select s.id, e from signups s, unnest(s.invited_emails) as e
on conflict do nothing;

alter table signups drop column if exists invited_emails;
