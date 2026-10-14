# CYGNUS — The Technical Club

### Project pages and admin editing

The projects page, cards, summaries, and banners are public. Opening a project requires a signed-in, approved member; visitors go to sign-in with a return link. Pending, rejected, and suspended accounts cannot open full details.

Briefs, features, components, milestones, next steps, repository links, and member notes are stored in `content_details`, protected by database row-level security. Only preview fields remain in `content.data`. The database moves other project fields to protected storage automatically, including when admins save through `save_content`. The public JavaScript bundle contains artwork defaults only.

**Existing database:** run [the project-access migration](supabase/migrations/20261006_project_member_access.sql) in Supabase SQL Editor **before deploying the frontend**. It preserves existing notes and edited fields and is safe to rerun. This is also included in `upgrade-existing.sql`; new installations use `schema.sql` then `seed.sql`. A frontend deployment alone does not update database access.

In **Admin → Projects → Edit**, update public artwork and introductions separately from member-only details. List fields use one entry per line. Project repository links accept GitHub HTTPS URLs. Generated artwork is documented in `docs/project-artwork.md`.

### Event access and faster navigation

In **Admin → Events → Edit → Visibility → Event access**, choose **Public** or **Members only**. Published previews remain visible to everyone. Public events open without login; members-only event details require approved membership. Registration still requires an approved member. Existing events stay members-only until explicitly changed.

Apply [the event-access migration](supabase/migrations/20261006_event_access.sql) to the existing database before deploying this frontend. It is also included in the combined upgrade and new-install schema. This grants anonymous reads only for explicitly public, published event details through row-level security; project details and drafts remain protected.

Timed boot screens have been removed. Guest project clicks go directly to login with the project return URL, and direct project bookmarks skip the project bundle for guests. Session hints only speed up routing; actual member access still uses verified authentication and database policies. Project controls and content requests no longer wait on website text requests.

### Search visibility and support

Public metadata, organization structured data, `public/robots.txt`, and `public/sitemap.xml` currently use `https://saclub.tech` as the production domain, with `https://saclub.tech/index.html` as the canonical homepage. If the production domain changes, update the absolute URLs in the public HTML files and these two crawler files together. Help Center opens a contact banner on the current page with Team CYGNUS information and `cygnus@btkit.org`; privacy, cookies, and terms are standalone static pages included in the Vite build.

After deploying, verify the production domain in Google Search Console and submit `https://saclub.tech/sitemap.xml`. Request indexing of the homepage. Search ranking is determined by Google and cannot be guaranteed. Account and admin pages use `noindex`; authentication and database policies remain the actual access controls.

### CYGNUS rename

The club is **CYGNUS**, described as **The Technical Club**. Before deploying this frontend to an existing database, run [the CYGNUS migration](supabase/migrations/20261013_cygnus_rebrand.sql) in the Supabase SQL editor. It changes `SAC-EC-001` to `CYG-EC-001` while preserving the department and number, continues each department's counter, and updates saved website/event/project copy. Existing accounts, approvals, registrations, content access, and user-written applications stay intact. It is transactional and safe to rerun; a conflicting issued ID stops the migration instead of renumbering a member silently. Older numeric IDs are assigned a department number. The combined `upgrade-existing.sql` includes this migration; do not run the old department migration after it.

The club contact address is `cygnus@btkit.org`. The domain `saclub.tech` and GitHub organization `SAclub` remain configured until replacements are provided. A domain change also needs hosting, redirects, authentication callback URLs, and email settings updated. Hosted Supabase email template copy is configured separately; use CYGNUS there too (see [upgrade guide](supabase/UPGRADE.md)).

The temporary symbol comes from the supplied futuristic CYGNUS artwork, with all source text removed. Asset details: [CYGNUS branding](docs/cygnus-branding.md). **Life at CYGNUS** replaces the second homepage event section. Add photographs through **Admin → Memories**. Apply [the memories migration](supabase/migrations/20261013_club_memories.sql) on an existing database (also included in the combined upgrade). New databases include it in `schema.sql`.

### Life at CYGNUS photo album

In **Admin → Memories**, upload a photo or supply an HTTPS image URL, enter its title and accessible image description, then optionally add a caption, date, and category. Save a draft or select **Publish on homepage**. Lower display-order numbers come first; the first published photo becomes the large featured image. Editing, unpublishing, and deleting album entries do not affect events. Uploaded files use the existing public image bucket; draft records are readable only by approved administrators.

The homepage shows six photos initially, with **More moments** for the rest. Click a photo to open the viewer; arrow buttons/keys browse, and Escape closes it and restores focus. With no published photos, a designed empty album appears—no generated pictures are presented as club memories. Event and album requests run independently. Edit the section's heading and introduction in **Website content → Home · Memories**.

### Public team directory

Use **Admin → Team → Add person** to enter a name, choose Builders, Thinkers, Shapers, Connectors, or Storytellers, and optionally add a public email and a LinkedIn `/in/` profile URL (with or without `https://`; regional links are accepted). **Publish person** makes the entry visible immediately. Select **Edit** to update their details or move them to another category; **Remove person** removes their public listing. This does not alter their club account.

On the Team page, selecting a category opens its list of names. Selecting a name expands that person's contact links. Empty categories show a coming-soon message; missing contact details stay unset. No people are seeded or copied from member accounts. Entries use separate `team-person-*` rows in the existing `site_content` table and its existing public-read/admin-write policies; no new database migration is required.
