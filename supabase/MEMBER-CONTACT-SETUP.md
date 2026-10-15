# Mobile numbers and member QR cards

## Existing Supabase project

Before deploying this frontend, open **Supabase Dashboard → SQL Editor → New query**. Paste and run the entire contents of [20261015_member_mobile.sql](migrations/20261015_member_mobile.sql).

This targeted migration assumes the current profiles, pronouns, email-confirmation helpers, and member RPCs are already installed. If the database is behind on earlier changes, run the updated [upgrade-existing.sql](upgrade-existing.sql) instead; it includes this migration at the end. Do not rerun `schema.sql` or `seed.sql` on an existing project.

The migration is transactional and safe to rerun. It:

- Adds nullable `public.profiles.mobile_number`, with a constraint accepting only `+91` followed by ten digits. Existing accounts remain intact, with unknown numbers left `NULL`.
- Adds `normalize_mobile_number(text)` for database-side validation and normalization. Numbers such as `9876543210` and `+91 98765 43210` are stored as `+919876543210`.
- Updates the existing signup trigger function `handle_new_user()` to copy `mobile_number` from signup metadata and require a number for new applications. OAuth accounts can still be created without one and complete their application afterward.
- Replaces `submit_application` with an eight-argument version adding `contact_number`. A valid number is required when submitting an application.
- Replaces `save_profile` with a three-argument version adding `contact_number`, so confirmed users can update their own number. Omitting this argument preserves the saved number for older clients; explicitly sending a blank or invalid number is rejected.
- Removes the old RPC overloads, restores authenticated-only RPC grants, and requests a PostgREST schema-cache refresh.
- Enforces the existing admissions switch for new signup applications and direct application RPC calls. Closing admissions does not block profile edits or confirmation of an existing application.

The existing profile read policy continues to permit only the account owner and approved administrators to read a number. The migration adds no public profile access. No new Storage bucket, QR table, public lookup endpoint, Edge Function, secret key, or Auth/redirect configuration is needed.

After running the SQL, deploy the updated website. New application submissions from the old frontend do not include a mobile number, so apply the migration and deploy the frontend together.

## New Supabase project

Run the updated `schema.sql` once, then `seed.sql`, as described in [README.md](README.md). The schema already includes the mobile-number migration; no separate run is needed.

## Verify the database

For a complete check of the required database objects, run [verify-setup.sql](verify-setup.sql). All rows should report `PASS`.

Run this in the trusted SQL Editor:

```sql
select member_id, status, mobile_number
from public.profiles
order by created_at desc;

select routine_name, parameter_name, data_type
from information_schema.parameters
join information_schema.routines using (specific_catalog, specific_schema, specific_name)
where routine_schema = 'public'
  and routine_name in ('save_profile', 'submit_application')
order by routine_name, ordinal_position;
```

Existing numbers may be `NULL`; do not fill them with invented or placeholder numbers. Existing members can sign in, enter their number under **Your profile**, and select **Save profile**. Their member ID and status are preserved.

Check a new email application and an OAuth application if Google sign-in is enabled. Confirm the submitted number appears in **Admin → Applications**, and after approval in **Admin → Members** and the member portal. Try an invalid number and verify it cannot be saved. Approve a member, open their QR card, download it, and scan it.

## QR behavior

Approved members with a saved name, assigned member ID, and valid mobile number receive a CYGNUS-styled QR card in their portal. Admins can see the same card when opening **Members → Manage**. Pending, rejected, and suspended accounts have no QR card in the interface.

The image is generated locally using [node-qrcode](https://github.com/soldair/node-qrcode). It encodes plain text containing the member's name, member ID, and formatted mobile number. A QR reader that supports text can show these details without a website login or network lookup. No contact data is sent to an external QR service.

Anyone with the image can read those three details. The portal generates a new image after saved details change; previously downloaded images keep their original details and cannot be revoked. The QR card is a shareable contact card, not live proof of membership or an attendance credential.
