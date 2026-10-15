# Code and Supabase review — 15 October 2026

## Corrections made

- Added the missing email-confirmation migration to `upgrade-existing.sql`, before the mobile-number functions that depend on `is_email_confirmed()`. The full combined upgrade now uses one transaction.
- Enforced the existing `applications_open` switch in the signup trigger and application RPC. Closing applications also blocks direct submissions from the member portal. Existing applicants can still confirm their email; existing profiles can still be edited.
- Matched local Auth configuration to the app: email confirmation enabled, 12-character minimum password, and Vite account redirect URLs.
- Disabled the unused generated `welcome-email` scaffold and removed its nonexistent import-map reference. It does not send welcome or approval emails. Standard confirmation and password-reset emails use Supabase Auth.
- Updated `npm test` to run all unit and database tests, including mobile-number, project, and team tests.
- Fixed the hidden mobile homepage repair button and the overlay intercepting the robot player's manual Play button. Filtered unsafe saved project website links before rendering them.

## Apply to the hosted database

1. Open **Supabase → SQL Editor** and run the entire updated [upgrade-existing.sql](upgrade-existing.sql). This is for an existing club database; it preserves accounts, approvals, contacts, and issued member IDs. Do not run `schema.sql` or `seed.sql` again on an existing database.
2. Run [verify-setup.sql](verify-setup.sql). Every row should say `PASS`. It is read-only and does not output member records.
3. Deploy the updated frontend. Verify a real email application, confirmation link, admin approval, mobile-number edit, QR download, and event registration.
4. Check hosted **Auth → URL Configuration**, SMTP, and email templates using [UPGRADE.md](UPGRADE.md). SQL migrations do not configure those settings. Keep `VITE_SITE_URL=https://saclub.tech` in the hosting environment unless the production domain changes.

For a new database, run the updated `schema.sql` then `seed.sql` once. The incremental SQL files in `migrations/` are SQL Editor scripts, not a complete CLI migration history: there is no initial schema migration and several historical files share a date prefix. Do not use `supabase db reset` or `db push` with that directory as-is. Establish and reconcile a proper baseline before adopting a CLI migration workflow. The documented SQL Editor setup is the supported path here.

Do not rerun older profile/email migrations after the combined upgrade: they can restore obsolete function overloads. The verification query checks for those overloads.

## Live checks and limits

Local validation completed: production build passed; all 45 unit/database tests passed. The full browser suite initially exposed five failures; after fixes and targeted reruns, all 55 browser scenarios passed. The setup verification query also passed against the local PostgreSQL schema and correctly reported a deliberately missing constraint.

Read-only requests made using the configured public API key confirmed that:

- Hosted email confirmation is enabled (`mailer_autoconfirm=false`), and signup is enabled.
- The `content`, `content_details` (including its `data` field), `site_content`, and `memories` endpoints respond successfully to zero-row requests.
- Anonymous requests to `profiles` are rejected with `permission denied`, as expected.

These requests did not retrieve any member records or change the hosted database. They cannot verify private columns, function signatures, all row-level policies, SMTP delivery, redirect settings, or Storage permissions. Run `verify-setup.sql` in the trusted SQL Editor for the database checks; exercise the real Auth and upload flows for the remaining hosted settings.

Local PostgreSQL tests execute the actual schema, migrations, policies, and RPCs with Supabase-owned schemas stubbed. Browser tests use mocked Supabase responses. Neither is a claim that the hosted database has received the latest SQL.

Configuration reference: [Supabase CLI configuration](https://supabase.com/docs/guides/local-development/cli/config). Local config changes do not by themselves update hosted Auth settings.
