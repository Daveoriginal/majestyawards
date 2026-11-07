HIS MAJESTY AWARDS — THE MAJESTIC ERA
Website starter project

CONTENTS
- index.html: public event homepage and registration
- style.css: responsive royal blue and gold styling
- supabase-config.js: Supabase client configuration
- app.js: countdown, registration, ticket confirmation and public capacity count
- admin.html: private admin sign-in and attendee dashboard
- admin.js: attendee search, CSV export and manual check-in
- supabase-admin-setup.sql: additional SQL functions and administrator allow-list

IMPORTANT EVENT DETAILS CURRENTLY SET IN THE WEBSITE
- Date: 20 December 2026
- Time: 9:30 AM (West Africa Time)
- Venue: Court of His Majesty, Teenagers Auditorium
- Capacity: 260

SETUP ORDER
1. Keep the original registration SQL script you already ran. It created public.attendees and public.register_attendee(...).
2. In Supabase > Project Settings > Data API, copy the Project URL.
3. In Supabase > Project Settings > API Keys, copy the publishable key (not secret/service_role).
4. Paste both into supabase-config.js.
5. Open Supabase > SQL Editor, create a new query, paste all of supabase-admin-setup.sql and run it.
6. In Supabase > Authentication > Users, create an administrator user with an email and strong password.
7. Copy the administrator user's UUID from the Users list.
8. In SQL Editor, run:
   insert into public.hma_admins (user_id)
   values ('PASTE-ADMIN-USER-UUID-HERE');
   Replace the placeholder with the real UUID. Do not share the UUID or password publicly.
9. Serve the folder using VS Code Live Server or another local web server. Do not open index.html as a file:// URL.
10. Test one registration. Check Supabase > Table Editor > attendees.
11. Open admin.html, sign in with the admin email/password and test attendee search and check-in.

DEPLOYMENT
Upload all files, preserving their names and folder structure, to your static hosting provider. The site needs HTTPS in production. If hosting under a subfolder, make sure the relative paths remain correct.

SECURITY NOTES
- Never put a Supabase secret key or service_role key in browser JavaScript.
- The public website can call the registration RPC only. It cannot directly read attendee rows.
- The admin dashboard uses Supabase Auth and the hma_admins allow-list. Only explicitly allow-listed users can read attendee records or check people in.
- Keep the admin password private and use a dedicated administrator account.
- The public ticket displays a QR code. The admin dashboard includes camera-based QR scanning and manual check-in from the attendee list. Camera access requires HTTPS (or localhost during development).
- Registration capacity is checked in the database transaction in the register_attendee function, so the client-side counter is informational only.
- The current registration function does not prevent duplicate phone numbers. If you want one registration per phone number, add a server-side uniqueness rule after deciding how shared family phone numbers should be handled.

CUSTOMISATION
- Replace the text-only HMA crest with the official HMA logo when available.
- Confirm event date, venue wording, department list and whether age/email should be required before publishing.
- This starter has no payment collection.
