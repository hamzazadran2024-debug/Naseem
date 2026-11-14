# Fleet Records

Daily driver records for a transport company. Arabic RTL, static site (no build step).

## Run locally
Open `index.html` in a browser, or run `python3 -m http.server` in this folder.
With no Supabase keys it runs in **local mode** (data stays in that browser).

## Go online (shared data)
1. Create a project at supabase.com.
2. SQL Editor: run `supabase/schema.sql`.
3. Authentication > Users: add the head's email and password. Disable public sign-ups.
4. Put your Project URL and anon key in `js/config.js`.
5. Deploy the folder to GitHub Pages, Netlify or Cloudflare Pages.

## Structure
- `js/db.js` data layer (local and Supabase adapters). The UI only calls `window.db`.
- `js/app.js` UI logic. `css/style.css` styles. `supabase/schema.sql` tables, view, security rules.

## Next steps
- Monthly PDF statement per company (reuse the existing letterhead format)
- Daily summary per driver, export to Excel
- More fields: vehicle plate, route, cargo, amount
- Driver login (restrict each driver to their own records)
