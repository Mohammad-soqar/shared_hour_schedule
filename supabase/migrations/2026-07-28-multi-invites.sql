-- Weekend sign-ups can now invite several teammates at once.
alter table signups add column if not exists invited_emails text[] not null default '{}';

update signups set invited_emails = array[invited_email]
where invited_email is not null and invited_emails = '{}';

alter table signups drop column if exists invited_email;
