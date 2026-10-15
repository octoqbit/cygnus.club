# Connect the CYGNUS admin and member portal

See [the code/Supabase audit](AUDIT.md) for the latest fixes and hosted checks. Run [verify-setup.sql](verify-setup.sql) in the SQL Editor to identify missing database objects without exposing member data.

For contact numbers and member QR cards, follow [the mobile-number setup guide](MEMBER-CONTACT-SETUP.md). On an otherwise current database, run [20261015_member_mobile.sql](migrations/20261015_member_mobile.sql) before deploying this frontend.

The website uses Supabase Auth, PostgreSQL row-level security, and Storage. No admin password or service-role key belongs in frontend code. `/admin` and `/account` work locally through Vite and on Vercel.

## 1. Create the database

Create a Supabase project. In its SQL editor, run **schema.sql**, then **seed.sql** from this folder. Run the schema once on a new project. The seed imports the original three events and four project concepts, with registrations initially closed.

Copy `.env.example` to `.env.local` in the project root. Set:

```
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
VITE_GOOGLE_AUTH_ENABLED=false
VITE_SITE_URL=https://saclub.tech
```

Use the project URL and **publishable key** (or legacy anon key) from the Supabase dashboard. Never use a secret/service-role key in a `VITE_` variable. Add these same variables to Vercel and redeploy. Restart Vite after local changes.

## 2. Configure authentication and email

In Authentication settings:

- Enable email/password sign-in and email confirmation. Set the minimum password length to 12.
- Set Site URL to `https://saclub.tech/account`. See [the existing-project upgrade guide](UPGRADE.md) for the complete redirect allowlist and confirmation template.
- Add redirect URLs for `https://YOUR_SITE/account`, `https://YOUR_SITE/account?mode=reset`, and local equivalents such as `http://localhost:5173/account` and `http://localhost:5173/account?mode=reset`. If using member return links, allow the account URL's query-string variants too.
- Configure custom SMTP for production confirmation and password-reset emails; the default development mail service is limited. Set appropriate auth rate limits and enable Supabase's bot protection if the public application form is abused.

Applicants choose a password, their fixed pronouns (He/Him or She/Her), and one of eight editable tech emojis. Admins retain the laptop-person emoji. The existing-project upgrade moves the old `boy` and `girl` choices to a separate `pronouns` column before replacing member avatars. Pronouns cannot be changed after selection; the database enforces this rule. Their **email is their login ID**. A department-based membership number, such as `CYG-EC-001`, is assigned when an admin approves them. Codes are `EC` (Electronics and Communication), `ME` (Mechanical), `CS` (Computer Science), `EE` (Electrical), and `OT` (Other). Each department starts at `001`, then `002`, and so on. Numbers expand beyond three digits after `999`. Reapproval keeps the same ID. Passwords are managed by Supabase Auth; administrators cannot view passwords.

Approval status is visible in the account and refreshes every 30 seconds. This implementation does not send approval emails. Email confirmation and password reset messages are sent by Supabase.

## 3. Bootstrap the first administrator

Apply once through `/join.html` using your real admin email, then confirm that email. In the trusted Supabase SQL editor, substitute that email and run:

```sql
update public.profiles
set role = 'admin', status = 'approved', reviewed_at = now()
where id = (
  select id from auth.users
  where lower(email) = lower('YOUR_ADMIN_EMAIL')
    and email_confirmed_at is not null
);
```

Confirm exactly one row was updated. Go to `/admin` and sign in with that email and password. Further admin promotions must also be made through trusted database administration; ordinary members cannot change roles or approve themselves.

## 4. Optional Google login

Enable the Google provider in Supabase Auth and configure its OAuth client in Google Cloud. Use the callback URL shown in Supabase. Enable **manual identity linking** in Supabase Auth for the profile's “Link Google account” action. Set `VITE_GOOGLE_AUTH_ENABLED=true` and redeploy.

A member can connect Google from their signed-in account. Google-only newcomers must complete the application in `/account` and await admin approval. Google sign-in never bypasses approval. Keep the flag false until provider configuration is finished.

## Daily use

- **Events / Projects:** create, edit, upload images (JPG, PNG, WebP, GIF, up to 5 MB), save drafts, publish, order, and delete. Full details are stored in a separate protected table.
- **Visibility:** select which events appear in the homepage event slides and which projects appear on the homepage. Existing slider motion and page designs are preserved.
- **Website content:** edit existing text, including banner words, without altering banner artwork. Text is plain text and preserves existing formatting. Save changes, then refresh the public page.
- **Applications:** review pending, incomplete, and rejected applications; approve and assign a member number; open or close admissions. Supabase enforces the admissions switch for signup and direct application submissions.
- **Members:** manage approved or suspended accounts, view mobile contacts and QR cards, suspend or restore access. Suspension immediately blocks protected data requests even if the user remains signed in.
- **Registrations:** approved members can register once for published, open, non-past events; members can cancel from their account. Admins see the registration list. Deleting an event also deletes its registrations, after a confirmation dialog.

Without Supabase configuration, public pages show the original preview content and account actions display an unavailable state. There are no demo credentials or local-storage admin bypasses. With Supabase configured, an empty content table is treated as empty; deleted items never reappear from fallback data.

## Verification

```
npm run build
npm test
npm run test:events
npm run test:database
npm run test:ui
```

Database tests execute the actual schema, policies, and RPCs in PostgreSQL via PGlite, with minimal stubs for Supabase-owned auth/storage schemas. UI tests use mocked Supabase responses; they do not provision or verify a hosted project. After configuration, smoke-test real email confirmation, admin login, approval, Google linking (if enabled), upload, publishing, registration, and password recovery against your own project.

References: [Supabase Auth](https://supabase.com/docs/guides/auth), [row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security), [identity linking](https://supabase.com/docs/guides/auth/auth-identity-linking).

## Existing database: CYGNUS rename

Run [20261013_cygnus_rebrand.sql](migrations/20261013_cygnus_rebrand.sql) for the rename, or [upgrade-existing.sql](upgrade-existing.sql) for the combined upgrade. Issued department IDs retain their department and number: `SAC-EC-001` becomes `CYG-EC-001`. New IDs use `CYG-<department>-<number>`. Counters continue independently per department, and reapproval keeps the same ID. The migration also updates club-authored saved text while preserving URLs, image paths, private access, accounts, and registrations. It stops transactionally if an old and new ID would collide. Do not rerun the initial schema or the historical department migration against the renamed project.

## Homepage memories

Apply [20261013_club_memories.sql](migrations/20261013_club_memories.sql) on an existing database, or use the combined upgrade. **Admin → Memories** controls photos, captions, dates, categories, display order, and publishing. Anonymous visitors and members can read published entries only; approved administrators can create, update, delete, and read drafts. The existing `content-images` upload bucket is reused. No photos are seeded.
