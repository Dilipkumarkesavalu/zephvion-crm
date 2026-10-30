# Zephvion CRM: going live with real logins

The public demo (<https://dilipkumarkesavalu.github.io/zephvion-crm/>) runs on
sample data in the browser. This guide sets up the **real** CRM:

- sign-in with a **6-digit code emailed** to the user (no passwords),
- **only `@zephvion.com` addresses** can sign in (enforced by the database),
- the team gets names and roles automatically on first sign-in:

  | Email | Name | Role |
  |---|---|---|
  | dilipkumark@zephvion.com | Dilip Kumar | Admin |
  | vbhavani@zephvion.com | Bhavani | User |
  | manjunath.poojary@zephvion.com | Manjunath Poojary | User |
  | narenn@zephvion.com | Naren | User |
  | akhileshaw@zephvion.com | Akhilesh | User |
  | bhuvans@zephvion.com | Bhuvan | User |

The real CRM will be published at
**<https://dilipkumarkesavalu.github.io/zephvion-crm/app/>**, next to the demo.

Time needed: about 30 minutes. Steps 1–5 happen in your own accounts.

> Never paste the Supabase **secret / service-role key** or the **database
> password** into chat, code or GitHub. Only the **project URL** and the
> **publishable key** are safe to share; they are public by design.

---

## 1. Create the Supabase project

1. Sign up at <https://supabase.com> (free plan is fine).
2. **New project** → name `zephvion-crm`, region **Mumbai (ap-south-1)**,
   choose a strong database password and keep it in your password manager.
3. When the project is ready, open **Project Settings → API keys** and note:
   - **Project URL**, e.g. `https://abcdefgh.supabase.co`
   - **Publishable key** (starts with `sb_publishable_`)
4. Note the **project ref**: the `abcdefgh` part of the URL.

## 2. Create the database tables

In a terminal, from the `zephvion-crm` folder:

```sh
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
npx supabase functions deploy
```

`link` and `db push` ask for the database password from step 1.
`functions deploy` installs the server functions used by the Users page and
the task assignment emails.

## 3. Add the team and the @zephvion.com rule

1. Supabase dashboard → **SQL Editor** → **New query**.
2. Paste the whole content of [`supabase/zephvion-team.sql`](../supabase/zephvion-team.sql)
   and click **Run**.

To change the team later, edit the e-mails/names in that file and run it again
(it is safe to re-run).

## 4. Turn on email codes

Supabase dashboard → **Authentication**:

1. **Sign In / Providers → Email**: enabled. Keep **Confirm email** on.
   Set **Email OTP length** to `6` and **Email OTP expiration** to `3600`.
2. **Emails → Templates → Confirm signup** and **Emails → Templates →
   Magic Link** (the first sign-in of an address sends "Confirm signup", later
   ones "Magic Link", so both need the code). For each:
   - Subject: `Your Zephvion CRM sign-in code`
   - Body: click **Source** and paste the content of
     [`supabase/templates/magic_link.html`](../supabase/templates/magic_link.html).
     It contains `{{ .Token }}`, which is what makes Supabase send a **code**
     instead of a link.

   Supabase only lets you edit templates once custom SMTP is set up, so do
   step 5 first if the template fields are locked.
3. **URL Configuration → Site URL**:
   `https://dilipkumarkesavalu.github.io/zephvion-crm/app/`

## 5. Send emails from your own domain (required)

Supabase's built-in mailer only delivers to the project owner's address and a
few emails per hour, so real codes to the team need your own SMTP server. With
Google Workspace (zephvion.com mail):

1. Use a mailbox such as `noreply@zephvion.com` (or your own).
2. In that Google account: **Security → 2-Step Verification** (turn on), then
   **App passwords** → create one named "Supabase" and copy the 16 characters.
3. Supabase → **Authentication → Emails → SMTP Settings** → enable custom SMTP:
   - Sender email: `noreply@zephvion.com`, sender name: `Zephvion CRM`
   - Host: `smtp.gmail.com`, port: `465`
   - Username: the mailbox address, password: the app password
4. **Authentication → Rate Limits**: raise "emails sent per hour" (e.g. 100).

Using another provider (Zoho, Resend, Brevo…) works the same way with its
SMTP host, port and credentials.

**Task assignment emails.** When someone assigns a task to a teammate, the
`notify_task_assignee` function emails them from the same mailbox. It needs the
mailbox details as function secrets (Supabase doesn't share the Auth SMTP
password with functions). From the `zephvion-crm` folder:

```sh
npx supabase secrets set SMTP_HOST=smtp.hostinger.com SMTP_PORT=465 SMTP_USER=noreply@zephvion.com
npx supabase secrets set SMTP_PASSWORD="<the noreply mailbox password>"
```

Optional: `SMTP_FROM_NAME` (default "Zephvion CRM") and `CRM_URL` (default the
GitHub Pages `/app/` address, used for the "Open in Zephvion CRM" button).
Without `SMTP_PASSWORD` tasks are still assigned, just without an email.

## 6. Publish the real CRM

GitHub → the `zephvion-crm` repository → **Settings → Secrets and variables →
Actions → Variables** tab → **New repository variable**, twice:

| Name | Value |
|---|---|
| `SUPABASE_URL` | the Project URL from step 1 |
| `SB_PUBLISHABLE_KEY` | the publishable key from step 1 |

Then **Actions → 🚀 Deploy → Run workflow** (or push any commit). After about
a minute the CRM is live at `/zephvion-crm/app/`, and the demo stays at
`/zephvion-crm/`.

## 7. First sign-in

1. Open <https://dilipkumarkesavalu.github.io/zephvion-crm/app/>.
2. Enter `dilipkumark@zephvion.com` → **Email me a code** → type the 6-digit code.
3. You are signed in as **Dilip Kumar (admin)**. Each team member does the
   same with their own address and lands as a regular user.

Anyone else with a `@zephvion.com` address can also sign in, as a regular user
named "Pending" until an admin edits their name on the **Users** page. Any
other domain is refused.

## 8. Send website enquiries to the lead inbox

The `lead_capture` function turns a zephvion.com contact form into a lead in
**Sell → Leads**: it is scored Hot / Warm / Cold, given to the member of
**Sales and Business Development** with the fewest open leads, and must be
contacted within 2 hours. A repeat enquiry from the same email within 30 days
is added to the open lead instead of creating a new one.

Point the website form at the function. Field names the function reads:
`name` (or `first_name` + `last_name`), `email`, `phone`, `company`, `service`,
`budget` (accepts "2 lakh", "₹1,50,000", "80k"), `message`, optional
`utm_source` / `utm_campaign`, and `redirect` (a zephvion.com thank-you page).
Keep the hidden `company_website` field empty: bots fill it and are dropped.

```html
<form method="post"
      action="https://uphoiejqlfbeogtvxxqp.supabase.co/functions/v1/lead_capture">
  <input name="name" required placeholder="Your name">
  <input name="email" type="email" placeholder="Email">
  <input name="phone" placeholder="Phone">
  <input name="company" placeholder="Company">
  <select name="service">
    <option>Website</option><option>Branding</option><option>Mobile app</option>
    <option>Digital system</option><option>Digital marketing</option><option>Consulting</option>
  </select>
  <input name="budget" placeholder="Budget, e.g. 2 lakh">
  <textarea name="message" placeholder="What do you need?"></textarea>
  <input name="company_website" tabindex="-1" autocomplete="off" style="display:none">
  <input type="hidden" name="redirect" value="https://zephvion.com/thank-you">
  <button>Send</button>
</form>
```

From JavaScript, `fetch` the same URL with a JSON body; it answers
`{ "ok": true }` or `{ "ok": false, "error": "..." }`. Browsers may post from
`https://zephvion.com` and `https://www.zephvion.com`; to allow other sites,
set the `LEAD_FORM_ORIGINS` secret to a comma-separated list.

Leads only get an owner once someone is in the **Sales and Business
Development** department; until then they arrive unassigned and everyone can
see them.

## 9. Billing: payments, reminders, Razorpay and Zoho Books

**Payments.** On a sent invoice, **Record payment** adds what arrived (bank
transfer, UPI, cheque…) and any TDS the client deducted. Part payments keep
the invoice open as "Partly paid"; once payments plus TDS cover the total it
is marked paid. **Billing → Receivables** shows who owes what, and how late.

**Repeating invoices.** On an invoice, set **Repeat** (monthly, quarterly or
yearly) and **Next invoice on**. Every day at 9:00 IST the CRM drafts the
next copy with a new number; check it and mark it sent.

**Reminders.** Every day the CRM emails the invoice's contact about unpaid
sent invoices: 3 days before the due date, on the day, then 7, 14 and 30 days
late, once each. **Send reminder** on an invoice sends one straight away.
Reminders go from the noreply mailbox (step 5) and include the bank details
from **Settings → Billing details** and the Razorpay link, if there is one.
The daily run is a scheduled database job that calls the `invoice_reminders`
function with the `REMINDERS_CRON_SECRET` secret.

**Razorpay payment links.** In the Razorpay dashboard:

1. **Account & Settings → API Keys → Generate key** (use Test mode first).
   From the `zephvion-crm` folder, type the two values yourself:

   ```sh
   npx supabase secrets set RAZORPAY_KEY_ID="rzp_..." RAZORPAY_KEY_SECRET="..." --project-ref uphoiejqlfbeogtvxxqp
   ```

2. **Account & Settings → Webhooks → Add new webhook**:
   - URL: `https://uphoiejqlfbeogtvxxqp.supabase.co/functions/v1/razorpay_webhook`
   - Secret: make up a long random string
   - Active event: `payment_link.paid`

   Then store the same secret for the CRM:

   ```sh
   npx supabase secrets set RAZORPAY_WEBHOOK_SECRET="the-same-secret" --project-ref uphoiejqlfbeogtvxxqp
   ```

**Razorpay link** on an invoice then creates a link for the balance (copied
to the clipboard, printed on the PDF and added to reminders). When the client
pays, the payment is recorded and the invoice is marked paid automatically.

**Zoho Books.** On **Quotes & Invoices**, filter the list (for example by
month) and choose **Export for Zoho Books**. In Zoho Books: **Sales →
Invoices → ⋯ → Import Invoices**, upload the file and confirm the column
mapping. Each line item is one row; rows with the same invoice number form
one invoice.

## 10. AI assistant (open-source model)

The assistant summarises clients, drafts emails and answers questions about
the CRM. It runs on an open-source model (default: Llama 3.3 70B) through any
service with an OpenAI-compatible API. It reads records as the person asking,
so it only sees what they can see, and it can never change anything. Each
person can make 100 requests a day; usage is logged in `ai_requests`.

**Connect it (Groq, the default):** create a key at <https://console.groq.com>
→ API Keys, then from the `zephvion-crm` folder type it yourself:

```sh
npx supabase secrets set AI_API_KEY="gsk_..." --project-ref uphoiejqlfbeogtvxxqp
```

**Another provider or your own server:** also set `AI_BASE_URL` and
`AI_MODEL`, for example:

| Provider | `AI_BASE_URL` | Example `AI_MODEL` |
|---|---|---|
| Groq (default) | `https://api.groq.com/openai/v1` | `openai/gpt-oss-120b` |
| Together AI | `https://api.together.xyz/v1` | `meta-llama/Llama-3.3-70B-Instruct-Turbo` |
| OpenRouter | `https://openrouter.ai/api/v1` | `meta-llama/llama-3.3-70b-instruct` |
| Your own Ollama / vLLM | `https://<your-server>/v1` | the model you pulled, e.g. `qwen2.5:32b` |

Pick a model that supports tool calling, or the "Ask AI" panel can't look
records up. With a hosted provider, the client details in a request are sent
to that provider; run your own Ollama or vLLM server to keep everything in
house.

If the assistant says "The AI service didn't answer", the provider's reason
is saved in the `outcome` column of the `ai_requests` table (for example
`error: 404 The model ... does not exist`). Fix the model with
`npx supabase secrets set AI_MODEL=<model> --project-ref uphoiejqlfbeogtvxxqp`.

## Troubleshooting

| Symptom | Fix |
|---|---|
| No email arrives | Check spam; check step 5 SMTP settings and the Supabase **Logs → Auth**. |
| Email contains a link, not a code | The Confirm signup or Magic Link template is missing `{{ .Token }}` (step 4.2). |
| "Error sending confirmation email" | Supabase **Logs → Auth**, open the error. `535 authentication failed` means the SMTP mailbox doesn't exist, the password is wrong, or 2FA is on for that mailbox. |
| "Only @zephvion.com email addresses can sign in" for a team member | Their address isn't on zephvion.com; fix the email in `zephvion-team.sql`. |
| "Too many attempts" | Wait 60 seconds between codes; raise rate limits (step 5.4). |
| Dilip isn't admin | Re-run `zephvion-team.sql`, then sign out and in again. |
