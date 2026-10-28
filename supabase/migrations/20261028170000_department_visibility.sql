-- Department-based visibility: members, managers and viewers see records
-- owned by people in their own department (or unassigned ones); owners,
-- admins, department heads and finance see everything.

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

drop policy "Enable read access for authenticated users" on public.companies;
drop policy "Enable update for authenticated users only" on public.companies;
drop policy "Company Delete Policy" on public.companies;
drop policy "Enable read access for authenticated users" on public.contacts;
drop policy "Enable update for authenticated users only" on public.contacts;
drop policy "Contact Delete Policy" on public.contacts;
drop policy "Enable read access for authenticated users" on public.contact_notes;
drop policy "Contact Notes Update policy" on public.contact_notes;
drop policy "Contact Notes Delete Policy" on public.contact_notes;
drop policy "Enable read access for authenticated users" on public.deals;
drop policy "Enable update for authenticated users only" on public.deals;
drop policy "Deals Delete Policy" on public.deals;
drop policy "Enable read access for authenticated users" on public.deal_notes;
drop policy "Deal Notes Update Policy" on public.deal_notes;
drop policy "Deal Notes Delete Policy" on public.deal_notes;
drop policy "Enable read access for authenticated users" on public.tasks;
drop policy "Task Update Policy" on public.tasks;
drop policy "Task Delete Policy" on public.tasks;
drop policy "Enable read access for authenticated users" on public.invoices;
drop policy "Enable update for authenticated users only" on public.invoices;
drop policy "Invoices Delete Policy" on public.invoices;

create policy "Enable read access for authenticated users" on public.companies for select to authenticated using (public.can_see_owner(sales_id));
create policy "Enable update for authenticated users only" on public.companies for update to authenticated using (public.can_see_owner(sales_id)) with check (true);
create policy "Company Delete Policy" on public.companies for delete to authenticated using (public.can_see_owner(sales_id));
create policy "Enable read access for authenticated users" on public.contacts for select to authenticated using (public.can_see_owner(sales_id) or exists (select 1 from public.companies c where c.id = contacts.company_id));
create policy "Enable update for authenticated users only" on public.contacts for update to authenticated using (public.can_see_owner(sales_id) or exists (select 1 from public.companies c where c.id = contacts.company_id)) with check (true);
create policy "Contact Delete Policy" on public.contacts for delete to authenticated using (public.can_see_owner(sales_id) or exists (select 1 from public.companies c where c.id = contacts.company_id));
create policy "Enable read access for authenticated users" on public.contact_notes for select to authenticated using (exists (select 1 from public.contacts c where c.id = contact_notes.contact_id));
create policy "Contact Notes Update policy" on public.contact_notes for update to authenticated using (exists (select 1 from public.contacts c where c.id = contact_notes.contact_id));
create policy "Contact Notes Delete Policy" on public.contact_notes for delete to authenticated using (exists (select 1 from public.contacts c where c.id = contact_notes.contact_id));
create policy "Enable read access for authenticated users" on public.deals for select to authenticated using (public.can_see_owner(sales_id) or exists (select 1 from public.companies c where c.id = deals.company_id));
create policy "Enable update for authenticated users only" on public.deals for update to authenticated using (public.can_see_owner(sales_id) or exists (select 1 from public.companies c where c.id = deals.company_id)) with check (true);
create policy "Deals Delete Policy" on public.deals for delete to authenticated using (public.can_see_owner(sales_id) or exists (select 1 from public.companies c where c.id = deals.company_id));
create policy "Enable read access for authenticated users" on public.deal_notes for select to authenticated using (exists (select 1 from public.deals d where d.id = deal_notes.deal_id));
create policy "Deal Notes Update Policy" on public.deal_notes for update to authenticated using (exists (select 1 from public.deals d where d.id = deal_notes.deal_id));
create policy "Deal Notes Delete Policy" on public.deal_notes for delete to authenticated using (exists (select 1 from public.deals d where d.id = deal_notes.deal_id));
create policy "Enable read access for authenticated users" on public.tasks for select to authenticated using (sales_id = public.current_sales_id() or exists (select 1 from public.contacts c where c.id = tasks.contact_id));
create policy "Task Update Policy" on public.tasks for update to authenticated using (sales_id = public.current_sales_id() or exists (select 1 from public.contacts c where c.id = tasks.contact_id));
create policy "Task Delete Policy" on public.tasks for delete to authenticated using (sales_id = public.current_sales_id() or exists (select 1 from public.contacts c where c.id = tasks.contact_id));
create policy "Enable read access for authenticated users" on public.invoices for select to authenticated using (public.can_see_owner(sales_id) or exists (select 1 from public.companies c where c.id = invoices.company_id));
create policy "Enable update for authenticated users only" on public.invoices for update to authenticated using (public.can_see_owner(sales_id) or exists (select 1 from public.companies c where c.id = invoices.company_id)) with check (true);
create policy "Invoices Delete Policy" on public.invoices for delete to authenticated using (public.can_see_owner(sales_id) or exists (select 1 from public.companies c where c.id = invoices.company_id));
