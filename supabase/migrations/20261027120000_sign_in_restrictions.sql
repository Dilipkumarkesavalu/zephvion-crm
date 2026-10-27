-- Sign-in restrictions: allowed email domains and team roster

-- Sign-in restrictions. Both tables are empty by default (no restriction);
-- fill them per deployment, e.g. with supabase/zephvion-team.sql.
create table public.allowed_email_domains (
    domain text primary key,
    constraint allowed_email_domains_lowercase check (domain = lower(domain))
);

-- Team members' names and roles, applied when they first sign in.
create table public.team_roster (
    email text primary key,
    first_name text not null,
    last_name text not null default '',
    administrator boolean not null default false,
    constraint team_roster_email_lowercase check (email = lower(email))
);

CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  sales_count int;
  roster_administrator boolean;
begin
  select count(id) into sales_count
  from public.sales;

  select administrator into roster_administrator
  from public.team_roster
  where email = lower(new.email);

  insert into public.sales (first_name, last_name, email, user_id, administrator)
  values (
    coalesce(new.raw_user_meta_data ->> 'first_name', new.raw_user_meta_data -> 'custom_claims' ->> 'first_name', 'Pending'),
    coalesce(new.raw_user_meta_data ->> 'last_name', new.raw_user_meta_data -> 'custom_claims' ->> 'last_name', 'Pending'),
    new.email,
    new.id,
    -- The roster decides roles; without a roster, the first user is admin
    coalesce(
      roster_administrator,
      sales_count = 0 and not exists (select 1 from public.team_roster)
    )
  );
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."prepare_auth_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  email_domain text;
  roster_first_name text;
  roster_last_name text;
begin
  -- Reject addresses outside the allowed domains, when any are configured
  email_domain := lower(split_part(coalesce(new.email, ''), '@', 2));
  if exists (select 1 from public.allowed_email_domains)
    and not exists (
      select 1 from public.allowed_email_domains where domain = email_domain
    ) then
    raise exception 'Email domain "%" is not allowed to sign in', email_domain
      using errcode = 'P0001';
  end if;

  -- Give roster members their name on creation (handle_new_user and
  -- handle_update_user read names from the user metadata)
  if tg_op = 'INSERT' then
    select first_name, last_name into roster_first_name, roster_last_name
    from public.team_roster
    where email = lower(new.email);

    if found then
      new.raw_user_meta_data := coalesce(new.raw_user_meta_data, '{}'::jsonb)
        || jsonb_build_object(
          'first_name', roster_first_name,
          'last_name', roster_last_name
        );
    end if;
  end if;

  return new;
end;
$$;

-- Runs before handle_new_user: enforces allowed email domains and applies
-- team roster names
create or replace trigger before_auth_user_saved
    before insert or update of email on auth.users
    for each row execute function public.prepare_auth_user();

-- Sign-in restrictions: readable and editable by admins only
alter table public.allowed_email_domains enable row level security;
alter table public.team_roster enable row level security;
create policy "Enable all for admins" on public.allowed_email_domains for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Enable all for admins" on public.team_roster for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant all on function public.prepare_auth_user() to service_role;

grant all on table public.allowed_email_domains to authenticated;
grant all on table public.allowed_email_domains to service_role;
grant all on table public.team_roster to authenticated;
grant all on table public.team_roster to service_role;
