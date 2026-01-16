# Felix Reservations

Premium dining and table reservations for Felix Restaurants. The app provides a customer-facing booking flow with rich restaurant cards, plus an internal management portal for reservations and operations.

## Features
- Multi-restaurant landing experience with media-rich cards
- Reservation flow with date/party size/area selection
- Admin portal for managing reservations
- Localization-ready UI
- Email notifications via Resend
- Supabase-backed data and auth

## Tech stack
- Next.js 15 + React 19
- TypeScript
- Tailwind CSS + Radix UI
- Supabase
- Resend

## Getting started
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create your environment file:
   ```bash
   cp .env.example .env
   ```
3. Fill in the required values in `.env`.
4. Run the dev server:
   ```bash
   npm run dev
   ```

## Scripts
- `npm run dev` - start the development server
- `npm run build` - build for production
- `npm run start` - run the production server
- `npm run lint` - lint the codebase

## Environment variables
Defined in `.env.example`:
- `SUPABASE_URL` - Supabase project URL (server-side)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server-side, keep private)
- `SUPABASE_ANON_KEY` - Supabase anon key (server-side)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (client-side)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key (client-side)
- `RESEND_API_KEY` - Resend API key for transactional email
- `MANAGEMENT_EMAIL` - notification recipient for management emails

## Deployment
Build the app with `npm run build`, then run with `npm run start`. Ensure all environment variables are configured in your hosting platform.
