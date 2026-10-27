# Zephvion CRM: going live with real logins

The public demo (<https://dilipkumarkesavalu.github.io/zephvion-crm/>) runs on
sample data in the browser. This guide sets up the **real** CRM:

- sign-in with a **6-digit code emailed** to the user (no passwords),
- **only `@zephvion.com` addresses** can sign in (enforced by the database),
- the team gets names and roles automatically on first sign-in:

  | Email | Name | Role |
  |---|---|---|
  | dilip@zephvion.com | Dilip Kumar | Admin |
  | bhavani@zephvion.com | Bhavani | User |
  | manjunath@zephvion.com | Manjunath | User |
  | naren@zephvion.com | Naren | User |
  | akhilesh@zephvion.com | Akhilesh | User |
  | bhuvan@zephvion.com | Bhuvan | User |

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
`functions deploy` installs the server functions used by the Users page.

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
2. **Emails → Templates → Magic Link**:
   - Subject: `Your Zephvion CRM sign-in code`
   - Body: paste the content of
     [`supabase/templates/magic_link.html`](../supabase/templates/magic_link.html).
     It contains `{{ .Token }}`, which is what makes Supabase send a **code**
     instead of a link.
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
2. Enter `dilip@zephvion.com` → **Email me a code** → type the 6-digit code.
3. You are signed in as **Dilip Kumar (admin)**. Each team member does the
   same with their own address and lands as a regular user.

Anyone else with a `@zephvion.com` address can also sign in, as a regular user
named "Pending" until an admin edits their name on the **Users** page. Any
other domain is refused.

## Troubleshooting

| Symptom | Fix |
|---|---|
| No email arrives | Check spam; check step 5 SMTP settings and the Supabase **Logs → Auth**. |
| Email contains a link, not a code | The Magic Link template is missing `{{ .Token }}` (step 4.2). |
| "Only @zephvion.com email addresses can sign in" for a team member | Their address isn't on zephvion.com; fix the email in `zephvion-team.sql`. |
| "Too many attempts" | Wait 60 seconds between codes; raise rate limits (step 5.4). |
| Dilip isn't admin | Re-run `zephvion-team.sql`, then sign out and in again. |
