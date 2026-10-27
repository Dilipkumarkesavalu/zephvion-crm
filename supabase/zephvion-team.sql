-- Zephvion team setup: run ONCE in the Supabase dashboard
-- (SQL Editor -> New query -> paste -> Run), after the migrations.
--
-- * Only @zephvion.com addresses can sign in (enforced by the database).
-- * Team members get their name and role automatically on first sign-in.
--   Anyone else with a @zephvion.com address can still sign in, as a
--   regular user.
--
-- Safe to re-run: existing rows are updated.

insert into public.allowed_email_domains (domain)
values ('zephvion.com')
on conflict (domain) do nothing;

insert into public.team_roster (email, first_name, last_name, administrator)
values
    ('dilip@zephvion.com', 'Dilip', 'Kumar', true),
    ('bhavani@zephvion.com', 'Bhavani', '', false),
    ('manjunath@zephvion.com', 'Manjunath', '', false),
    ('naren@zephvion.com', 'Naren', '', false),
    ('akhilesh@zephvion.com', 'Akhilesh', '', false),
    ('bhuvan@zephvion.com', 'Bhuvan', '', false)
on conflict (email) do update
set first_name = excluded.first_name,
    last_name = excluded.last_name,
    administrator = excluded.administrator;

-- If someone already signed in before this script ran, sync their name
-- (through the auth metadata, which handle_update_user copies to sales)
-- and their role
update auth.users u
set raw_user_meta_data = coalesce(u.raw_user_meta_data, '{}'::jsonb)
    || jsonb_build_object('first_name', r.first_name, 'last_name', r.last_name)
from public.team_roster r
where lower(u.email) = r.email;

update public.sales s
set administrator = r.administrator
from public.team_roster r
where lower(s.email) = r.email;
