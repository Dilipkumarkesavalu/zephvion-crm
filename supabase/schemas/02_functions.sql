--
-- Functions
-- This file declares all PL/pgSQL functions in the public schema.
--

CREATE OR REPLACE FUNCTION "public"."cleanup_note_attachments"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
    DECLARE
      payload jsonb;
      request_headers jsonb;
      auth_header text;
    BEGIN
      request_headers := coalesce(
        nullif(current_setting('request.headers', true), '')::jsonb,
        '{}'::jsonb
      );
      auth_header := request_headers ->> 'authorization';

      IF auth_header IS NULL OR auth_header = '' THEN
        IF TG_OP = 'DELETE' THEN
          RETURN OLD;
        END IF;

        RETURN NEW;
      END IF;

      payload := jsonb_build_object(
        'old_record', OLD,
        'record', NEW,
        'type', TG_OP
      );

      PERFORM net.http_post(
        url := public.get_note_attachments_function_url(),
        body := payload,
        params := '{}'::jsonb,
        headers := jsonb_build_object(
          'Content-Type',
          'application/json',
          'Authorization',
          auth_header
        ),
        timeout_milliseconds := 10000
      );

      IF TG_OP = 'DELETE' THEN
        RETURN OLD;
      END IF;

      RETURN NEW;
    END;
    $$;

CREATE OR REPLACE FUNCTION "public"."get_avatar_for_email"("email" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare email_hash text;
declare gravatar_url text;
declare gravatar_status int8;
declare email_domain text;
declare favicon_url text;
declare domain_status int8;

begin
    -- Try to fetch a gravatar image
    email_hash = encode(extensions.digest(email, 'sha256'), 'hex');
    gravatar_url = concat('https://www.gravatar.com/avatar/', email_hash, '?d=404');

    select status from extensions.http_get(gravatar_url) into gravatar_status;

    if gravatar_status = 200 then
        return gravatar_url;
    end if;

    -- Fallback to email's domain favicon if not excluded
    email_domain = split_part(email, '@', 2);
    return get_domain_favicon(email_domain);
exception
    when others then
        return 'ERROR';
end;
$$;

CREATE OR REPLACE FUNCTION "public"."get_domain_favicon"("domain_name" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare domain_status int8;

begin
    if exists (select from favicons_excluded_domains as fav where fav.domain = domain_name) then
        return null;
    end if;

    return concat(
        'https://favicon.show/',
        (regexp_matches(domain_name, '^(?:https?:\/\/)?(?:[^@\/\n]+@)?(?:www\.)?([^:\/?\n]+)', 'i'))[1]
    );
end;
$$;

CREATE OR REPLACE FUNCTION "public"."get_note_attachments_function_url"() RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
    DECLARE
      issuer text;
      function_url text;
    BEGIN
      issuer := coalesce(
        nullif(current_setting('request.jwt.claim.iss', true), ''),
        (
          coalesce(
            nullif(current_setting('request.jwt.claims', true), ''),
            '{}'
          )::jsonb ->> 'iss'
        )
      );
      issuer := nullif(issuer, '');
      IF issuer IS NOT NULL THEN
        issuer := rtrim(issuer, '/');
        IF right(issuer, 8) = '/auth/v1' THEN
          function_url :=
            left(issuer, length(issuer) - 8) || '/functions/v1/delete_note_attachments';

          IF function_url LIKE 'http://127.0.0.1:%' THEN
            RETURN replace(
              function_url,
              'http://127.0.0.1:',
              'http://host.docker.internal:'
            );
          END IF;

          IF function_url LIKE 'http://localhost:%' THEN
            RETURN replace(
              function_url,
              'http://localhost:',
              'http://host.docker.internal:'
            );
          END IF;

          RETURN function_url;
        END IF;
      END IF;

      RETURN 'http://host.docker.internal:54321/functions/v1/delete_note_attachments';
    END;
    $$;

CREATE OR REPLACE FUNCTION "public"."get_user_id_by_email"("email" "text") RETURNS TABLE("id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
BEGIN
  RETURN QUERY SELECT au.id FROM auth.users au WHERE au.email = $1;
END;
$_$;

CREATE OR REPLACE FUNCTION "public"."handle_company_saved"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare company_logo text;

begin
    if new.logo is not null then
        return new;
    end if;

    company_logo = get_domain_favicon(new.website);
    if company_logo is null then
        return new;
    end if;

    new.logo = concat('{"src":"', company_logo, '","title":"Company favicon"}');
    return new;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."handle_contact_note_created_or_updated"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  update public.contacts set last_seen = new.date where contacts.id = new.contact_id and contacts.last_seen < new.date;
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."handle_contact_saved"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$declare contact_avatar text;
declare emails_length int8;
declare item jsonb;

begin
    if new.avatar is not null then
        return new;
    end if;

    if tg_op = 'UPDATE' and new.email_jsonb is not distinct from old.email_jsonb then
        return new;
    end if;

    select coalesce(jsonb_array_length(new.email_jsonb), 0) into emails_length;

    if emails_length = 0 then
        return new;
    end if;

    for item in select jsonb_array_elements(new.email_jsonb)
    loop
        select public.get_avatar_for_email(item->>'email') into contact_avatar;
        if (contact_avatar is not null) then
            exit;
        end if;
    end loop;

    if contact_avatar is null then
        return new;
    end if;

    new.avatar = concat('{"src":"', contact_avatar, '"}');
    return new;
end;$$;

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

CREATE OR REPLACE FUNCTION "public"."handle_tag_deleted"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  update public.contacts set tags = array_remove(tags, old.id) where tags @> array[old.id];
  return old;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."handle_update_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  update public.sales
  set
    first_name = coalesce(new.raw_user_meta_data ->> 'first_name', new.raw_user_meta_data -> 'custom_claims' ->> 'first_name', 'Pending'),
    last_name = coalesce(new.raw_user_meta_data ->> 'last_name', new.raw_user_meta_data -> 'custom_claims' ->> 'last_name', 'Pending'),
    email = new.email
  where user_id = new.id;

  return new;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  return exists (
    select 1 from public.sales where user_id = auth.uid() and administrator = true
  );
end;
$$;

CREATE OR REPLACE FUNCTION "public"."merge_contacts"("loser_id" bigint, "winner_id" bigint) RETURNS bigint
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  winner_contact contacts%ROWTYPE;
  loser_contact contacts%ROWTYPE;
  deal_record RECORD;
  merged_emails jsonb;
  merged_phones jsonb;
  merged_tags bigint[];
  winner_emails jsonb;
  loser_emails jsonb;
  winner_phones jsonb;
  loser_phones jsonb;
  email_map jsonb;
  phone_map jsonb;
BEGIN
  -- Fetch both contacts
  SELECT * INTO winner_contact FROM contacts WHERE id = winner_id;
  SELECT * INTO loser_contact FROM contacts WHERE id = loser_id;

  IF winner_contact IS NULL OR loser_contact IS NULL THEN
    RAISE EXCEPTION 'Contact not found';
  END IF;

  -- 1. Reassign tasks from loser to winner
  UPDATE tasks SET contact_id = winner_id WHERE contact_id = loser_id;

  -- 2. Reassign contact notes from loser to winner
  UPDATE contact_notes SET contact_id = winner_id WHERE contact_id = loser_id;

  -- 3. Update deals - replace loser with winner in contact_ids array
  FOR deal_record IN
    SELECT id, contact_ids
    FROM deals
    WHERE contact_ids @> ARRAY[loser_id]
  LOOP
    UPDATE deals
    SET contact_ids = (
      SELECT ARRAY(
        SELECT DISTINCT unnest(
          array_remove(deal_record.contact_ids, loser_id) || ARRAY[winner_id]
        )
      )
    )
    WHERE id = deal_record.id;
  END LOOP;

  -- 4. Merge contact data

  -- Get email arrays
  winner_emails := COALESCE(winner_contact.email_jsonb, '[]'::jsonb);
  loser_emails := COALESCE(loser_contact.email_jsonb, '[]'::jsonb);

  -- Merge emails with deduplication by email address
  -- Build a map of email -> email object, then convert back to array
  email_map := '{}'::jsonb;

  -- Add winner emails to map
  IF jsonb_array_length(winner_emails) > 0 THEN
    FOR i IN 0..jsonb_array_length(winner_emails)-1 LOOP
      email_map := email_map || jsonb_build_object(
        winner_emails->i->>'email',
        winner_emails->i
      );
    END LOOP;
  END IF;

  -- Add loser emails to map (won't overwrite existing keys)
  IF jsonb_array_length(loser_emails) > 0 THEN
    FOR i IN 0..jsonb_array_length(loser_emails)-1 LOOP
      IF NOT email_map ? (loser_emails->i->>'email') THEN
        email_map := email_map || jsonb_build_object(
          loser_emails->i->>'email',
          loser_emails->i
        );
      END IF;
    END LOOP;
  END IF;

  -- Convert map back to array
  merged_emails := (SELECT jsonb_agg(value) FROM jsonb_each(email_map));
  merged_emails := COALESCE(merged_emails, '[]'::jsonb);

  -- Get phone arrays
  winner_phones := COALESCE(winner_contact.phone_jsonb, '[]'::jsonb);
  loser_phones := COALESCE(loser_contact.phone_jsonb, '[]'::jsonb);

  -- Merge phones with deduplication by number
  phone_map := '{}'::jsonb;

  -- Add winner phones to map
  IF jsonb_array_length(winner_phones) > 0 THEN
    FOR i IN 0..jsonb_array_length(winner_phones)-1 LOOP
      phone_map := phone_map || jsonb_build_object(
        winner_phones->i->>'number',
        winner_phones->i
      );
    END LOOP;
  END IF;

  -- Add loser phones to map (won't overwrite existing keys)
  IF jsonb_array_length(loser_phones) > 0 THEN
    FOR i IN 0..jsonb_array_length(loser_phones)-1 LOOP
      IF NOT phone_map ? (loser_phones->i->>'number') THEN
        phone_map := phone_map || jsonb_build_object(
          loser_phones->i->>'number',
          loser_phones->i
        );
      END IF;
    END LOOP;
  END IF;

  -- Convert map back to array
  merged_phones := (SELECT jsonb_agg(value) FROM jsonb_each(phone_map));
  merged_phones := COALESCE(merged_phones, '[]'::jsonb);

  -- Merge tags (remove duplicates)
  merged_tags := ARRAY(
    SELECT DISTINCT unnest(
      COALESCE(winner_contact.tags, ARRAY[]::bigint[]) ||
      COALESCE(loser_contact.tags, ARRAY[]::bigint[])
    )
  );

  -- 5. Update winner with merged data
  UPDATE contacts SET
    avatar = COALESCE(winner_contact.avatar, loser_contact.avatar),
    gender = COALESCE(winner_contact.gender, loser_contact.gender),
    first_name = COALESCE(winner_contact.first_name, loser_contact.first_name),
    last_name = COALESCE(winner_contact.last_name, loser_contact.last_name),
    title = COALESCE(winner_contact.title, loser_contact.title),
    company_id = COALESCE(winner_contact.company_id, loser_contact.company_id),
    email_jsonb = merged_emails,
    phone_jsonb = merged_phones,
    linkedin_url = COALESCE(winner_contact.linkedin_url, loser_contact.linkedin_url),
    background = COALESCE(winner_contact.background, loser_contact.background),
    has_newsletter = COALESCE(winner_contact.has_newsletter, loser_contact.has_newsletter),
    first_seen = LEAST(COALESCE(winner_contact.first_seen, loser_contact.first_seen), COALESCE(loser_contact.first_seen, winner_contact.first_seen)),
    last_seen = GREATEST(COALESCE(winner_contact.last_seen, loser_contact.last_seen), COALESCE(loser_contact.last_seen, winner_contact.last_seen)),
    sales_id = COALESCE(winner_contact.sales_id, loser_contact.sales_id),
    tags = merged_tags
  WHERE id = winner_id;

  -- 6. Delete loser contact
  DELETE FROM contacts WHERE id = loser_id;

  RETURN winner_id;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."lowercase_email_jsonb"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.email_jsonb IS NOT NULL THEN
    NEW.email_jsonb = COALESCE((
      SELECT jsonb_agg(
        jsonb_set(elem, '{email}', to_jsonb(LOWER(elem->>'email')))
      )
      FROM jsonb_array_elements(NEW.email_jsonb) AS elem
    ), '[]'::jsonb);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."set_sales_id_default"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.sales_id IS NULL THEN
    SELECT id INTO NEW.sales_id FROM sales WHERE user_id = auth.uid();
  END IF;
  RETURN NEW;
END;
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

-- Roles, audit log and notifications
CREATE OR REPLACE FUNCTION "public"."sync_sales_role"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  -- "administrator" stays the flag the app and policies check; "role" is the
  -- finer-grained source of truth. Whichever one changed drives the other.
  if tg_op = 'INSERT' then
    if new.administrator and new.role not in ('owner', 'admin') then
      new.role := 'admin';
    end if;
  elsif new.role is not distinct from old.role
    and new.administrator is distinct from old.administrator then
    new.role := case
      when new.administrator then 'admin'
      when old.role in ('owner', 'admin') then 'member'
      else old.role
    end;
  end if;
  new.administrator := new.role in ('owner', 'admin');
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."current_sales_id"() RETURNS bigint
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select id from public.sales where user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION "public"."write_audit_log"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  old_row jsonb;
  new_row jsonb;
  diff jsonb := '{}'::jsonb;
begin
  if tg_op = 'INSERT' then
    new_row := to_jsonb(new);
    insert into public.audit_log (table_name, record_id, action, sales_id, changes)
    values (tg_table_name, new_row ->> 'id', 'insert', public.current_sales_id(), new_row);
    return new;
  elsif tg_op = 'DELETE' then
    old_row := to_jsonb(old);
    insert into public.audit_log (table_name, record_id, action, sales_id, changes)
    values (tg_table_name, old_row ->> 'id', 'delete', public.current_sales_id(), old_row);
    return old;
  end if;

  old_row := to_jsonb(old);
  new_row := to_jsonb(new);
  -- Only the fields that changed, as {"field": [old, new]}
  select coalesce(jsonb_object_agg(n.key, jsonb_build_array(old_row -> n.key, n.value)), '{}'::jsonb)
  into diff
  from jsonb_each(new_row) n
  where n.value is distinct from old_row -> n.key;

  if diff <> '{}'::jsonb then
    insert into public.audit_log (table_name, record_id, action, sales_id, changes)
    values (tg_table_name, new_row ->> 'id', 'update', public.current_sales_id(), diff);
  end if;
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."notify_assignment"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  actor bigint := public.current_sales_id();
  row_data jsonb := to_jsonb(new);
  record_title text;
begin
  if new.sales_id is null
    or (tg_op = 'UPDATE' and new.sales_id is not distinct from old.sales_id)
    or new.sales_id is not distinct from actor then
    return new;
  end if;

  record_title := case tg_table_name
    when 'contacts' then trim(concat_ws(' ', row_data ->> 'first_name', row_data ->> 'last_name'))
    when 'leads' then trim(concat_ws(' ', row_data ->> 'first_name', row_data ->> 'last_name', nullif('· ' || coalesce(row_data ->> 'company_name', ''), '· ')))
    when 'tasks' then row_data ->> 'text'
    when 'tickets' then concat_ws(' ', row_data ->> 'number', row_data ->> 'subject')
    else row_data ->> 'name'
  end;

  insert into public.notifications (recipient_sales_id, actor_sales_id, type, resource, record_id, title)
  values (
    new.sales_id,
    actor,
    tg_table_name || '_assigned',
    tg_table_name,
    (row_data ->> 'id')::bigint,
    left(coalesce(nullif(record_title, ''), 'Untitled'), 200)
  );
  return new;
end;
$$;

-- Department-based record visibility
CREATE OR REPLACE FUNCTION "public"."visible_sales_ids"() RETURNS bigint[]
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  -- null means every record; otherwise the account managers whose records
  -- the current user may see (their own department, or just themselves)
  select case
    when me.id is null then array[]::bigint[]
    when me.role in ('owner', 'admin', 'head', 'finance') then null
    when me.department_id is null then array[me.id]
    else array(select s.id from public.sales s where s.department_id = me.department_id)
  end
  from (select 1) as one
  left join public.sales me on me.user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION "public"."can_see_owner"("owner_sales_id" bigint) RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  select owner_sales_id is null
    or public.visible_sales_ids() is null
    or owner_sales_id = any(public.visible_sales_ids())
$$;

-- Leads: scoring, owner pick and preparation
-- Same rules as src/components/zephvion-crm/leads/leadScore.ts
CREATE OR REPLACE FUNCTION "public"."lead_score"("lead" "public"."leads") RETURNS integer
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
  select least(100,
    case
      when coalesce(lead.budget, 0) >= 500000 then 40
      when coalesce(lead.budget, 0) >= 200000 then 30
      when coalesce(lead.budget, 0) >= 50000 then 20
      when coalesce(lead.budget, 0) > 0 then 10
      else 0
    end
    + case when coalesce(trim(lead.company_name), '') <> '' then 15 else 0 end
    + case when coalesce(trim(lead.phone), '') <> '' then 10 else 0 end
    + case when coalesce(trim(lead.email), '') <> '' then 5 else 0 end
    + case lead.source
        when 'referral' then 20
        when 'website' then 15
        when 'whatsapp' then 15
        when 'email' then 10
        when 'linkedin' then 10
        when 'event' then 10
        else 5
      end
    + case when char_length(coalesce(lead.message, '')) >= 40 then 10 else 0 end
  )
$$;

-- Active member of the sales department with the fewest open leads
CREATE OR REPLACE FUNCTION "public"."pick_lead_owner"() RETURNS bigint
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select s.id
  from public.sales s
  join public.departments d on d.id = s.department_id
  where d.name = 'Sales and Business Development' and not s.disabled
  order by (
    select count(*) from public.leads l
    where l.sales_id = s.id and l.status in ('new', 'contacted', 'qualified')
  ), s.id
  limit 1
$$;

CREATE OR REPLACE FUNCTION "public"."prepare_lead"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  new.updated_at := now();
  new.score := public.lead_score(new);
  if tg_op = 'INSERT' then
    if new.sales_id is null then
      new.sales_id := public.pick_lead_owner();
    end if;
    -- Two hours to make first contact
    new.first_response_due := coalesce(new.first_response_due, new.created_at + interval '2 hours');
  end if;
  if new.status <> 'new' and new.first_responded_at is null then
    new.first_responded_at := now();
  end if;
  return new;
end;
$$;

-- Billing: payment totals, invoice numbers and recurring invoices
CREATE OR REPLACE FUNCTION "public"."refresh_invoice_payments"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  target_id bigint := coalesce(new.invoice_id, old.invoice_id);
  settled numeric(14, 2);
  last_paid date;
begin
  select coalesce(sum(p.amount + p.tds_amount), 0), max(p.paid_on)
    into settled, last_paid
    from public.invoice_payments p
    where p.invoice_id = target_id;

  update public.invoices i
  set amount_paid = settled,
      status = case
        when i.type = 'invoice' and i.status in ('sent', 'paid') and settled >= i.total then 'paid'
        when i.type = 'invoice' and i.status = 'paid' and settled < i.total then 'sent'
        else i.status
      end,
      paid_at = case
        when i.type = 'invoice' and settled >= i.total then coalesce(i.paid_at, last_paid::timestamp with time zone)
        when i.type = 'invoice' and i.status = 'paid' and settled < i.total then null
        else i.paid_at
      end,
      updated_at = now()
  where i.id = target_id;
  return null;
end;
$$;

-- Same series as getNextDocumentNumber() in invoiceModel.ts: INV-2026-0001
CREATE OR REPLACE FUNCTION "public"."next_invoice_number"("issued_on" date) RETURNS text
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select 'INV-' || extract(year from issued_on)::int || '-' || lpad((
    coalesce(max(nullif(regexp_replace(substr(i.number, 10), '\D', '', 'g'), '')::int), 0) + 1
  )::text, 4, '0')
  from public.invoices i
  where i.number like 'INV-' || extract(year from issued_on)::int || '-%'
$$;

-- Drafts the next invoice for every recurring invoice that is due, so the
-- team can check and send it. Catches up on missed runs, at most 12 at a time.
CREATE OR REPLACE FUNCTION "public"."generate_recurring_invoices"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  template public.invoices;
  step interval;
  payment_days integer;
  created integer := 0;
  rounds integer;
begin
  for template in
    select * from public.invoices
    where type = 'invoice' and recurrence <> 'none' and status <> 'cancelled'
      and next_issue_date is not null and next_issue_date <= current_date
    for update
  loop
    step := case template.recurrence
      when 'monthly' then interval '1 month'
      when 'quarterly' then interval '3 months'
      else interval '1 year'
    end;
    payment_days := coalesce(template.due_date - template.issue_date, 15);
    rounds := 0;
    while template.next_issue_date <= current_date and rounds < 12 loop
      insert into public.invoices (
        type, number, status, company_id, contact_id, deal_id, sales_id,
        issue_date, due_date, tax_mode, items, notes, subtotal, tax_total, total,
        recurring_parent_id
      ) values (
        'invoice', public.next_invoice_number(template.next_issue_date), 'draft',
        template.company_id, template.contact_id, template.deal_id, template.sales_id,
        template.next_issue_date, template.next_issue_date + payment_days,
        template.tax_mode, template.items, template.notes,
        template.subtotal, template.tax_total, template.total, template.id
      );
      template.next_issue_date := (template.next_issue_date + step)::date;
      rounds := rounds + 1;
      created := created + 1;
    end loop;
    update public.invoices set next_issue_date = template.next_issue_date where id = template.id;
  end loop;
  return created;
end;
$$;

-- generate_recurring_invoices() runs daily through pg_cron, scheduled in
-- migration 20261030100000_billing.sql

-- Delivery
CREATE OR REPLACE FUNCTION "public"."touch_project"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Stamps when a milestone is done, and clears it if reopened
CREATE OR REPLACE FUNCTION "public"."stamp_milestone_completion"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  if new.status = 'done' and new.completed_at is null then
    new.completed_at := now();
  elsif new.status <> 'done' then
    new.completed_at := null;
  end if;
  return new;
end;
$$;

-- Support desk
-- Deadlines per priority: hours to first response, hours to resolve.
-- Same values as TICKET_SLA_HOURS in src/components/zephvion-crm/tickets/ticketModel.ts
CREATE OR REPLACE FUNCTION "public"."ticket_sla_hours"("priority" text, "kind" text) RETURNS integer
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
  select case kind
    when 'response' then case priority when 'urgent' then 1 when 'high' then 4 when 'normal' then 8 else 24 end
    else case priority when 'urgent' then 8 when 'high' then 24 when 'normal' then 72 else 120 end
  end
$$;

-- Active member of the support team with the fewest open tickets
CREATE OR REPLACE FUNCTION "public"."pick_ticket_owner"() RETURNS bigint
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select s.id
  from public.sales s
  join public.departments d on d.id = s.department_id
  where d.name = 'Support and Customer Success' and not s.disabled
  order by (
    select count(*) from public.tickets t
    where t.sales_id = s.id and t.status in ('open', 'in_progress', 'waiting_client')
  ), s.id
  limit 1
$$;

CREATE OR REPLACE FUNCTION "public"."prepare_ticket"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  new.updated_at := now();
  if tg_op = 'INSERT' then
    if new.sales_id is null then
      new.sales_id := public.pick_ticket_owner();
    end if;
    new.first_response_due := new.created_at + make_interval(hours => public.ticket_sla_hours(new.priority, 'response'));
    new.resolve_due := new.created_at + make_interval(hours => public.ticket_sla_hours(new.priority, 'resolve'));
  elsif new.priority is distinct from old.priority then
    -- A new priority moves the deadlines, counted from when the ticket came in
    new.first_response_due := new.created_at + make_interval(hours => public.ticket_sla_hours(new.priority, 'response'));
    new.resolve_due := new.created_at + make_interval(hours => public.ticket_sla_hours(new.priority, 'resolve'));
  end if;
  if new.status in ('resolved', 'closed') then
    new.resolved_at := coalesce(new.resolved_at, now());
  else
    new.resolved_at := null;
  end if;
  if new.status <> 'open' and new.first_responded_at is null then
    new.first_responded_at := now();
  end if;
  return new;
end;
$$;

-- A reply to the client (not an internal note) counts as the first response
CREATE OR REPLACE FUNCTION "public"."mark_ticket_responded"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if not new.is_internal then
    update public.tickets
    set first_responded_at = coalesce(first_responded_at, new.created_at)
    where id = new.ticket_id and first_responded_at is null;
  end if;
  update public.tickets set updated_at = now() where id = new.ticket_id;
  return new;
end;
$$;

-- Automation rules
-- Runs one rule's action for one record. Returns what happened.
CREATE OR REPLACE FUNCTION "public"."apply_automation_rule"("rule" "public"."automation_rules", "resource" text, "record" jsonb) RETURNS text
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  recipient_setting text := coalesce(rule.action_config ->> 'recipient', 'owner');
  recipient bigint;
  record_id bigint := (record ->> 'id')::bigint;
  record_title text;
  contact_id bigint;
  outcome text;
begin
  recipient := case
    when recipient_setting = 'owner' then nullif(record ->> 'sales_id', '')::bigint
    else nullif(recipient_setting, '')::bigint
  end;
  if recipient is not null and not exists (
    select 1 from public.sales s where s.id = recipient and not s.disabled
  ) then
    recipient := null;
  end if;

  record_title := case resource
    when 'leads' then trim(concat_ws(' ', record ->> 'first_name', record ->> 'last_name'))
    when 'tickets' then concat_ws(' ', record ->> 'number', record ->> 'subject')
    else coalesce(record ->> 'name', record ->> 'number')
  end;

  if rule.action = 'create_task' then
    contact_id := case resource
      when 'deals' then nullif(record -> 'contact_ids' ->> 0, '')::bigint
      when 'tickets' then nullif(record ->> 'contact_id', '')::bigint
      when 'invoices' then nullif(record ->> 'contact_id', '')::bigint
      else null
    end;
    if contact_id is null then
      outcome := 'skipped: no contact to attach the task to';
    else
      insert into public.tasks (contact_id, type, text, due_date, sales_id)
      values (
        contact_id,
        coalesce(nullif(rule.action_config ->> 'task_type', ''), 'none'),
        left(coalesce(nullif(rule.action_config ->> 'task_text', ''), rule.name) || ' (' || coalesce(record_title, '') || ')', 500),
        now() + make_interval(days => coalesce((rule.action_config ->> 'due_days')::int, 1)),
        recipient
      );
      outcome := 'task created';
    end if;
  elsif recipient is null then
    outcome := 'skipped: nobody to notify';
  else
    insert into public.notifications (recipient_sales_id, actor_sales_id, type, resource, record_id, title)
    values (
      recipient,
      null,
      'automation',
      resource,
      record_id,
      left(coalesce(nullif(rule.action_config ->> 'message', ''), rule.name) || ': ' || coalesce(record_title, ''), 200)
    );
    outcome := 'notified';
  end if;

  update public.automation_rules
  set run_count = run_count + 1, last_run_at = now()
  where id = rule.id;
  return outcome;
end;
$$;

-- Event rules: a record changed, check which active rules match it
CREATE OR REPLACE FUNCTION "public"."run_event_automations"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  event_name text;
  row_data jsonb := to_jsonb(new);
  rule public.automation_rules;
  outcome text;
begin
  event_name := case
    when tg_table_name = 'deals' and tg_op = 'UPDATE'
      and row_data ->> 'stage' is distinct from to_jsonb(old) ->> 'stage' then 'deal_stage_changed'
    when tg_table_name = 'leads' and tg_op = 'INSERT' then 'lead_created'
    when tg_table_name = 'tickets' and tg_op = 'INSERT' then 'ticket_created'
    else null
  end;
  if event_name is null then
    return new;
  end if;

  for rule in
    select * from public.automation_rules r
    where r.is_active and r.event = event_name
      -- Every condition key must equal the record's field ("any" or empty matches all)
      and not exists (
        select 1 from jsonb_each_text(r.condition) c
        where c.value not in ('', 'any') and coalesce(row_data ->> c.key, '') <> c.value
      )
    order by r.id
  loop
    outcome := public.apply_automation_rule(rule, tg_table_name, row_data);
    insert into public.automation_runs (rule_id, resource, record_id, outcome)
    values (rule.id, tg_table_name, (row_data ->> 'id')::bigint, outcome);
  end loop;
  return new;
end;
$$;

-- Time rules, run daily: deals quiet for N days, invoices unpaid N days late
CREATE OR REPLACE FUNCTION "public"."run_scheduled_automations"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  rule public.automation_rules;
  target record;
  days integer;
  outcome text;
  fired integer := 0;
begin
  for rule in
    select * from public.automation_rules where is_active and event in ('deal_idle', 'invoice_overdue')
  loop
    days := greatest(1, coalesce((rule.condition ->> 'days')::int, 14));
    if rule.event = 'deal_idle' then
      for target in
        select d.* from public.deals d
        where d.archived_at is null and d.stage not in ('won', 'lost')
          and d.updated_at < now() - make_interval(days => days)
          and not exists (
            select 1 from public.automation_runs ar
            where ar.rule_id = rule.id and ar.resource = 'deals' and ar.record_id = d.id
              and ar.record_version is not distinct from d.updated_at
          )
        limit 200
      loop
        outcome := public.apply_automation_rule(rule, 'deals', to_jsonb(target));
        insert into public.automation_runs (rule_id, resource, record_id, outcome, record_version)
        values (rule.id, 'deals', target.id, outcome, target.updated_at);
        fired := fired + 1;
      end loop;
    else
      for target in
        select i.* from public.invoices i
        where i.type = 'invoice' and i.status = 'sent'
          and i.due_date < current_date - days
          and not exists (
            select 1 from public.automation_runs ar
            where ar.rule_id = rule.id and ar.resource = 'invoices' and ar.record_id = i.id
          )
        limit 200
      loop
        outcome := public.apply_automation_rule(rule, 'invoices', to_jsonb(target));
        insert into public.automation_runs (rule_id, resource, record_id, outcome)
        values (rule.id, 'invoices', target.id, outcome);
        fired := fired + 1;
      end loop;
    end if;
  end loop;
  return fired;
end;
$$;

-- run_scheduled_automations() runs daily through pg_cron, scheduled in
-- migration 20261030200000_automations.sql
