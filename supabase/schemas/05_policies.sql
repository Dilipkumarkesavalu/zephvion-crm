--
-- Row Level Security
-- This file declares RLS policies for all tables.
--

-- Enable RLS on all tables
alter table public.companies enable row level security;
alter table public.contacts enable row level security;
alter table public.contact_notes enable row level security;
alter table public.deals enable row level security;
alter table public.deal_notes enable row level security;
alter table public.sales enable row level security;
alter table public.tags enable row level security;
alter table public.tasks enable row level security;
alter table public.invoices enable row level security;
alter table public.configuration enable row level security;
alter table public.favicons_excluded_domains enable row level security;

-- Companies
create policy "Enable read access for authenticated users" on public.companies for select to authenticated using (public.can_see_owner(sales_id));
create policy "Enable insert for authenticated users only" on public.companies for insert to authenticated with check (true);
create policy "Enable update for authenticated users only" on public.companies for update to authenticated using (public.can_see_owner(sales_id)) with check (true);
create policy "Company Delete Policy" on public.companies for delete to authenticated using (public.can_see_owner(sales_id));

-- Contacts
create policy "Enable read access for authenticated users" on public.contacts for select to authenticated using (public.can_see_owner(sales_id) or exists (select 1 from public.companies c where c.id = contacts.company_id));
create policy "Enable insert for authenticated users only" on public.contacts for insert to authenticated with check (true);
create policy "Enable update for authenticated users only" on public.contacts for update to authenticated using (public.can_see_owner(sales_id) or exists (select 1 from public.companies c where c.id = contacts.company_id)) with check (true);
create policy "Contact Delete Policy" on public.contacts for delete to authenticated using (public.can_see_owner(sales_id) or exists (select 1 from public.companies c where c.id = contacts.company_id));

-- Contact Notes
create policy "Enable read access for authenticated users" on public.contact_notes for select to authenticated using (exists (select 1 from public.contacts c where c.id = contact_notes.contact_id));
create policy "Enable insert for authenticated users only" on public.contact_notes for insert to authenticated with check (true);
create policy "Contact Notes Update policy" on public.contact_notes for update to authenticated using (exists (select 1 from public.contacts c where c.id = contact_notes.contact_id));
create policy "Contact Notes Delete Policy" on public.contact_notes for delete to authenticated using (exists (select 1 from public.contacts c where c.id = contact_notes.contact_id));

-- Deals
create policy "Enable read access for authenticated users" on public.deals for select to authenticated using (public.can_see_owner(sales_id) or exists (select 1 from public.companies c where c.id = deals.company_id));
create policy "Enable insert for authenticated users only" on public.deals for insert to authenticated with check (true);
create policy "Enable update for authenticated users only" on public.deals for update to authenticated using (public.can_see_owner(sales_id) or exists (select 1 from public.companies c where c.id = deals.company_id)) with check (true);
create policy "Deals Delete Policy" on public.deals for delete to authenticated using (public.can_see_owner(sales_id) or exists (select 1 from public.companies c where c.id = deals.company_id));

-- Deal Notes
create policy "Enable read access for authenticated users" on public.deal_notes for select to authenticated using (exists (select 1 from public.deals d where d.id = deal_notes.deal_id));
create policy "Enable insert for authenticated users only" on public.deal_notes for insert to authenticated with check (true);
create policy "Deal Notes Update Policy" on public.deal_notes for update to authenticated using (exists (select 1 from public.deals d where d.id = deal_notes.deal_id));
create policy "Deal Notes Delete Policy" on public.deal_notes for delete to authenticated using (exists (select 1 from public.deals d where d.id = deal_notes.deal_id));

-- Sales
create policy "Enable read access for authenticated users" on public.sales for select to authenticated using (true);

-- Tags
create policy "Enable read access for authenticated users" on public.tags for select to authenticated using (true);
create policy "Enable insert for authenticated users only" on public.tags for insert to authenticated with check (true);
create policy "Enable update for authenticated users only" on public.tags for update to authenticated using (true);
create policy "Enable delete for authenticated users only" on public.tags for delete to authenticated using (true);

-- Tasks
create policy "Enable read access for authenticated users" on public.tasks for select to authenticated using (sales_id = public.current_sales_id() or exists (select 1 from public.contacts c where c.id = tasks.contact_id));
create policy "Enable insert for authenticated users only" on public.tasks for insert to authenticated with check (true);
create policy "Task Update Policy" on public.tasks for update to authenticated using (sales_id = public.current_sales_id() or exists (select 1 from public.contacts c where c.id = tasks.contact_id));
create policy "Task Delete Policy" on public.tasks for delete to authenticated using (sales_id = public.current_sales_id() or exists (select 1 from public.contacts c where c.id = tasks.contact_id));

-- Configuration (admin-only for writes)
create policy "Enable read for authenticated" on public.configuration for select to authenticated using (true);
create policy "Enable insert for admins" on public.configuration for insert to authenticated with check (public.is_admin());
create policy "Enable update for admins" on public.configuration for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Favicons excluded domains
create policy "Enable access for authenticated users only" on public.favicons_excluded_domains to authenticated using (true) with check (true);

-- Invoices
create policy "Enable read access for authenticated users" on public.invoices for select to authenticated using (public.can_see_owner(sales_id) or exists (select 1 from public.companies c where c.id = invoices.company_id));
create policy "Enable insert for authenticated users only" on public.invoices for insert to authenticated with check (true);
create policy "Enable update for authenticated users only" on public.invoices for update to authenticated using (public.can_see_owner(sales_id) or exists (select 1 from public.companies c where c.id = invoices.company_id)) with check (true);
create policy "Invoices Delete Policy" on public.invoices for delete to authenticated using (public.can_see_owner(sales_id) or exists (select 1 from public.companies c where c.id = invoices.company_id));

-- Sign-in restrictions: readable and editable by admins only
alter table public.allowed_email_domains enable row level security;
alter table public.team_roster enable row level security;
create policy "Enable all for admins" on public.allowed_email_domains for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Enable all for admins" on public.team_roster for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Departments, audit log and notifications
alter table public.departments enable row level security;

alter table public.audit_log enable row level security;

alter table public.notifications enable row level security;

create policy "Enable read access for authenticated users" on public.departments for select to authenticated using (true);

create policy "Enable insert for admins" on public.departments for insert to authenticated with check (public.is_admin());

create policy "Enable update for admins" on public.departments for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Enable delete for admins" on public.departments for delete to authenticated using (public.is_admin());

create policy "Enable read access for admins" on public.audit_log for select to authenticated using (public.is_admin());

create policy "Recipients read their notifications" on public.notifications for select to authenticated using (recipient_sales_id = public.current_sales_id());

create policy "Recipients update their notifications" on public.notifications for update to authenticated using (recipient_sales_id = public.current_sales_id()) with check (recipient_sales_id = public.current_sales_id());

create policy "Recipients delete their notifications" on public.notifications for delete to authenticated using (recipient_sales_id = public.current_sales_id());

-- Saved list views
alter table public.saved_views enable row level security;
create policy "Read own and shared views" on public.saved_views for select to authenticated using (sales_id = public.current_sales_id() or is_shared);
create policy "Create own views" on public.saved_views for insert to authenticated with check (sales_id = public.current_sales_id());
create policy "Update own views" on public.saved_views for update to authenticated using (sales_id = public.current_sales_id()) with check (sales_id = public.current_sales_id());
create policy "Delete own views" on public.saved_views for delete to authenticated using (sales_id = public.current_sales_id());

-- Leads
alter table public.leads enable row level security;
create policy "Read visible leads" on public.leads for select to authenticated using (public.can_see_owner(sales_id));
create policy "Create leads" on public.leads for insert to authenticated with check (true);
create policy "Update visible leads" on public.leads for update to authenticated using (public.can_see_owner(sales_id)) with check (true);
create policy "Delete visible leads" on public.leads for delete to authenticated using (public.can_see_owner(sales_id));

-- Billing
alter table public.invoice_payments enable row level security;
create policy "Read payments on visible invoices" on public.invoice_payments for select to authenticated using (exists (select 1 from public.invoices i where i.id = invoice_payments.invoice_id));
create policy "Record payments on visible invoices" on public.invoice_payments for insert to authenticated with check (exists (select 1 from public.invoices i where i.id = invoice_payments.invoice_id));
create policy "Correct payments on visible invoices" on public.invoice_payments for update to authenticated using (exists (select 1 from public.invoices i where i.id = invoice_payments.invoice_id)) with check (exists (select 1 from public.invoices i where i.id = invoice_payments.invoice_id));
create policy "Delete payments on visible invoices" on public.invoice_payments for delete to authenticated using (exists (select 1 from public.invoices i where i.id = invoice_payments.invoice_id));

alter table public.invoice_reminders enable row level security;
create policy "Read reminders on visible invoices" on public.invoice_reminders for select to authenticated using (exists (select 1 from public.invoices i where i.id = invoice_reminders.invoice_id));
