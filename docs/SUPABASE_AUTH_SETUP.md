# Supabase authentication setup

The app now uses Supabase Auth for account credentials and sessions. The browser no longer creates its own authentication tokens or treats a local profile as proof of identity.

## 1. Create a Supabase project

1. Create a project at https://supabase.com/dashboard.
2. Open **Project Settings → API**.
3. Copy the Project URL and the publishable/anon public key.

## 2. Configure email authentication

1. Open **Authentication → Providers → Email** and enable Email.
2. Keep email confirmation enabled for production.
3. Configure your SMTP/email delivery settings if you need reliable production confirmation and recovery emails. Supabase's default email service has sending limits.

## 3. Configure redirect URLs

In **Authentication → URL Configuration**:

- Site URL: `https://vocalnotepad.vercel.app`
- Add Redirect URLs:
  - `https://vocalnotepad.vercel.app/**`
  - `https://*.vercel.app/**` (for Vercel preview deployments)
  - `http://localhost:5173/**` (local development)

The application returns OAuth and email confirmation/recovery flows to the current app origin.

## 4. Configure Google and GitHub OAuth (optional)

For each provider you want to offer:

1. Create an OAuth application in the provider's developer console.
2. Set its callback/redirect URL to the Supabase callback shown in **Authentication → Providers**. It normally has this form:
   `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
3. Add the provider Client ID and Client Secret in Supabase's provider settings and enable the provider.

Do not put OAuth client secrets in this repository or in Vite environment variables.

## 5. Add Vercel environment variables

In Vercel → Vocal-note → Settings → Environment Variables, add these for Production, Preview and Development:

- `VITE_SUPABASE_URL` = your Supabase Project URL
- `VITE_SUPABASE_ANON_KEY` = your Supabase anon/publishable public key

Use only the public anon/publishable key in the browser. **Never use the Supabase service-role key** in a `VITE_*` variable or commit it to GitHub.

After saving the variables, redeploy the Vercel preview for this branch. Vite environment variables are embedded at build time.

## 6. Test before production

- Sign up with a new email; confirm it using the email link.
- Sign in with the correct password; confirm a wrong password is rejected.
- Request a password reset and complete the new-password form from the email link.
- Test Google/GitHub only after each provider is configured.
- Sign out, reload, and confirm the protected dashboard is no longer accessible.
- Confirm existing notes still appear after sign-in. This authentication change does not migrate locally stored notes or make note data cloud-synced.

## Existing local sessions

The old browser-generated demo sessions are no longer accepted as authenticated sessions. Users must create or sign in to a real Supabase account. Existing note data is not intentionally deleted by this change.
