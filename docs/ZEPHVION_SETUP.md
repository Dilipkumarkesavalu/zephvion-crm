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

## Troubleshooting

| Symptom | Fix |
|---|---|
| No email arrives | Check spam; check step 5 SMTP settings and the Supabase **Logs → Auth**. |
| Email contains a link, not a code | The Confirm signup or Magic Link template is missing `{{ .Token }}` (step 4.2). |
| "Error sending confirmation email" | Supabase **Logs → Auth**, open the error. `535 authentication failed` means the SMTP mailbox doesn't exist, the password is wrong, or 2FA is on for that mailbox. |
| "Only @zephvion.com email addresses can sign in" for a team member | Their address isn't on zephvion.com; fix the email in `zephvion-team.sql`. |
| "Too many attempts" | Wait 60 seconds between codes; raise rate limits (step 5.4). |
| Dilip isn't admin | Re-run `zephvion-team.sql`, then sign out and in again. |
