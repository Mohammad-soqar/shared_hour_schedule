-- Teams: the design team runs its shared hour at a different time.
alter table allowed_members add column if not exists team text not null default 'core';

update allowed_members set team = 'design'
where email in ('amnamohammed1123@gmail.com', 'usama.sipahi@tigflo.com');
