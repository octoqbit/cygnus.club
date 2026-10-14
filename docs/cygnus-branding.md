# CYGNUS — The Technical Club

CYGNUS is the complete name, not an acronym. Use `The Technical Club` beneath CYGNUS in page-header logo lockups, including account/admin branding, and in the index-page footer logo. Other footer logos and repeated labels use `CYGNUS` alone. Introductory prose and descriptive metadata may still describe the club. Member IDs use `CYG-EC-001`, `CYG-CS-001`, `CYG-ME-001`, etc., with independent department counters.

## Temporary logo

- Supplied reference: `Futuristic Cygnus Engineering Club Logo.png`.
- Extracted symbol: `public/brand/cygnus-symbol.png`.
- Social preview: `public/cygnus-social.png` (the same symbol, with no source text).
- Browser icon: `public/cygnus-favicon.svg` (the symbol embedded on a light circular backing).
- Website wordmark: exact lettering from `public/brand/cygnus-light-original.png` and `public/brand/cygnus-dark-original.png`, displayed through CSS background viewports in `brand.css`. The source images are unchanged, and the HTML retains accessible CYGNUS text. No matching font file was supplied, so the lettering is artwork rather than a substitute font.
- Dark surfaces use `public/brand/cygnus-dark-original.png`, copied unchanged from `logo for black background.png`. CSS displays just the emblem on the dark Events header, Projects and project-detail headers/footers and the account/admin sign-in panels; the robot chip uses an SVG viewport. The emblem and wordmark are displayed separately, excluding the embedded subtitle and slogan. The light-background emblem remains on light pages.
- Robot chip: SVG face in `robot-3d/index.html`, with separate viewports for the dark symbol and exact CYGNUS wordmark. Video and tracking are unchanged.

The built-in imagegen tool extracted the symbol using this prompt:

> Use case: background-extraction. Edit target: supplied Futuristic Cygnus Engineering Club Logo.png. Extract ONLY the upper angular black, silver and red flying swan/circuit emblem. Preserve its shape, proportions, faceted shading, red crest, circuit details and orientation exactly. Remove ALL text, slogans, typography, horizontal rules and white paper background. Output a tightly framed transparent PNG containing only the emblem with small even transparent margins. No text whatsoever, no new elements, no shadow outside the emblem. This is the existing logo symbol for a website, not a logo redesign. Save output image file and return its path.

The supplied original and historical artwork remain available. The website uses the extracted symbol, not the original image's typography or subtitle.

## Homepage memories — implemented

The visible album heading is **Moments at CYGNUS**, set in DM Serif Display with a Georgia fallback. Its first line uses the new `home-memory-heading-0` content slot so saved “LIFE AT” copy does not overwrite it. Clicking or keyboard-activating the featured photo opens a modal banner with the full image, title, caption, category, and optional date. Previous/next buttons and arrow keys browse the album; Escape, the close button, and the backdrop dismiss it. Autoplay pauses while the modal is open, and focus returns to the photo afterward.

**Life at CYGNUS** replaces the second event section. It uses the homepage's warm grey canvas, orange details, fine borders and bold typography. One featured photograph sits beside smaller moments; cards stack on small screens. Each shows a title, optional caption/date and category. Six photos appear initially, with a More moments button for additional entries. The accessible full-size viewer supports arrow keys, Escape and focus restoration; reduced motion disables photo zoom transitions.

Publish genuine club photos through **Admin → Memories** after applying `supabase/migrations/20261013_club_memories.sql`. Photos are not invented or seeded; the empty album has an illustrated photo frame and “First moments. Coming soon.” message. Text fields use new CMS identifiers so old Experience-section overrides cannot overwrite the gallery. The first event section remains for event information and registration.

## Rollout

Apply `supabase/migrations/20261013_cygnus_rebrand.sql` (or the combined upgrade) before deploying the frontend. Code changes do not apply a hosted database migration or change hosted email templates automatically. The browser compatibility helper converts old saved website copy during rollout; the SQL migration persists the change and also updates event/project text.

Existing URLs and contact addresses remain until replacements are supplied. Internal browser storage keys, event identifiers, and historical migrations retain compatibility names; these do not appear as the club's displayed name. Calendar UIDs remain stable to avoid creating duplicate previously downloaded events.
