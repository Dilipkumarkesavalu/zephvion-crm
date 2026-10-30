--
-- Triggers
-- This file declares all triggers.
--

-- Auto-populate sales_id from current auth user on insert
create or replace trigger set_company_sales_id_trigger
    before insert on public.companies
    for each row execute function public.set_sales_id_default();

create or replace trigger set_contact_sales_id_trigger
    before insert on public.contacts
    for each row execute function public.set_sales_id_default();

create or replace trigger set_contact_notes_sales_id_trigger
    before insert on public.contact_notes
    for each row execute function public.set_sales_id_default();

create or replace trigger set_deal_sales_id_trigger
    before insert on public.deals
    for each row execute function public.set_sales_id_default();

create or replace trigger set_deal_notes_sales_id_trigger
    before insert on public.deal_notes
    for each row execute function public.set_sales_id_default();

create or replace trigger set_task_sales_id_trigger
    before insert on public.tasks
    for each row execute function public.set_sales_id_default();

-- Auto-fetch company logo from website favicon on save
create or replace trigger company_saved
    before insert or update on public.companies
    for each row execute function public.handle_company_saved();

-- Lowercase contact emails before insert or update (must run before contact_saved)
create or replace trigger "10_lowercase_contact_emails"
    before insert or update on public.contacts
    for each row execute function public.lowercase_email_jsonb();

-- Auto-fetch contact avatar from email on save (runs after lowercase_contact_emails)
create or replace trigger "20_contact_saved"
    before insert or update on public.contacts
    for each row execute function public.handle_contact_saved();

-- Update contact.last_seen when a contact note is created
create or replace trigger on_public_contact_notes_created_or_updated
    after insert on public.contact_notes
    for each row execute function public.handle_contact_note_created_or_updated();

-- Cleanup storage attachments when contact notes are updated or deleted
create or replace trigger on_contact_notes_attachments_updated_delete_note_attachments
    after update on public.contact_notes
    for each row
    when (old.attachments is distinct from new.attachments)
    execute function public.cleanup_note_attachments();

create or replace trigger on_contact_notes_deleted_delete_note_attachments
    after delete on public.contact_notes
    for each row execute function public.cleanup_note_attachments();

-- Cleanup storage attachments when deal notes are updated or deleted
create or replace trigger on_deal_notes_attachments_updated_delete_note_attachments
    after update on public.deal_notes
    for each row
    when (old.attachments is distinct from new.attachments)
    execute function public.cleanup_note_attachments();

create or replace trigger on_deal_notes_deleted_delete_note_attachments
    after delete on public.deal_notes
    for each row execute function public.cleanup_note_attachments();

-- Remove a deleted tag from every contact that references it
create or replace trigger on_tag_deleted
    after delete on public.tags
    for each row execute function public.handle_tag_deleted();

-- Auth triggers: sync auth.users to public.sales
create or replace trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

create or replace trigger on_auth_user_updated
    after update on auth.users
    for each row execute function public.handle_update_user();

create or replace trigger set_invoice_sales_id_trigger
    before insert on public.invoices
    for each row execute function public.set_sales_id_default();

-- Runs before handle_new_user: enforces allowed email domains and applies
-- team roster names
create or replace trigger before_auth_user_saved
    before insert or update of email on auth.users
    for each row execute function public.prepare_auth_user();

-- Role sync, audit log and assignment notifications
create or replace trigger sync_sales_role
    before insert or update on public.sales
    for each row execute function public.sync_sales_role();

create or replace trigger audit_companies after insert or update or delete on public.companies for each row execute function public.write_audit_log();

create or replace trigger audit_contacts after insert or update or delete on public.contacts for each row execute function public.write_audit_log();

create or replace trigger audit_deals after insert or update or delete on public.deals for each row execute function public.write_audit_log();

create or replace trigger audit_tasks after insert or update or delete on public.tasks for each row execute function public.write_audit_log();

create or replace trigger audit_invoices after insert or update or delete on public.invoices for each row execute function public.write_audit_log();

create or replace trigger audit_sales after insert or update or delete on public.sales for each row execute function public.write_audit_log();

create or replace trigger audit_departments after insert or update or delete on public.departments for each row execute function public.write_audit_log();

create or replace trigger notify_task_assignment after insert or update of sales_id on public.tasks for each row execute function public.notify_assignment();

create or replace trigger notify_deal_assignment after insert or update of sales_id on public.deals for each row execute function public.notify_assignment();

create or replace trigger notify_contact_assignment after insert or update of sales_id on public.contacts for each row execute function public.notify_assignment();

create or replace trigger notify_company_assignment after insert or update of sales_id on public.companies for each row execute function public.notify_assignment();

-- Leads
create or replace trigger prepare_lead before insert or update on public.leads
    for each row execute function public.prepare_lead();
create or replace trigger audit_leads after insert or update or delete on public.leads
    for each row execute function public.write_audit_log();
create or replace trigger notify_lead_assignment after insert or update of sales_id on public.leads
    for each row execute function public.notify_assignment();

-- Billing
create or replace trigger refresh_invoice_payments after insert or update or delete on public.invoice_payments
    for each row execute function public.refresh_invoice_payments();
create or replace trigger audit_invoice_payments after insert or update or delete on public.invoice_payments
    for each row execute function public.write_audit_log();

-- Delivery
create or replace trigger touch_project before update on public.projects
    for each row execute function public.touch_project();
create or replace trigger stamp_milestone_completion before insert or update on public.project_milestones
    for each row execute function public.stamp_milestone_completion();
create or replace trigger audit_projects after insert or update or delete on public.projects
    for each row execute function public.write_audit_log();
create or replace trigger notify_project_assignment after insert or update of sales_id on public.projects
    for each row execute function public.notify_assignment();

-- Support desk
create or replace trigger prepare_ticket before insert or update on public.tickets
    for each row execute function public.prepare_ticket();
create or replace trigger mark_ticket_responded after insert on public.ticket_comments
    for each row execute function public.mark_ticket_responded();
create or replace trigger audit_tickets after insert or update or delete on public.tickets
    for each row execute function public.write_audit_log();
create or replace trigger notify_ticket_assignment after insert or update of sales_id on public.tickets
    for each row execute function public.notify_assignment();

-- Automation rules
create or replace trigger automations_on_deal_stage after update of stage on public.deals
    for each row execute function public.run_event_automations();
create or replace trigger automations_on_lead after insert on public.leads
    for each row execute function public.run_event_automations();
create or replace trigger automations_on_ticket after insert on public.tickets
    for each row execute function public.run_event_automations();
create or replace trigger audit_automation_rules after insert or update or delete on public.automation_rules
    for each row execute function public.write_audit_log();

-- Client portal
create or replace trigger audit_portal_access after insert or update or delete on public.portal_access
    for each row execute function public.write_audit_log();
