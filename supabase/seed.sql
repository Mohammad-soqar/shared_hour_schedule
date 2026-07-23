-- Team allowlist — run after schema.sql (safe to re-run).
insert into allowed_members (email, display_name) values
  ('mnsoqar1@gmail.com', 'Mohammad Soqar'),
  ('baselbasha136@gmail.com', 'Basel Basha'),
  ('abdulkerim.sipahi@tigflo.com', 'Abdulkerim Sipahi'),
  ('roobaanmt@gmail.com', 'Roobaan M T'),
  ('usama.sipahi@tigflo.com', 'Usama Sipahi'),
  ('amnamohammed1123@gmail.com', 'Amna Mohamed')
on conflict (email) do update set display_name = excluded.display_name;
