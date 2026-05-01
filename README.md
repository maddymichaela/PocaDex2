<div align="center">
  <img src="public/pocadex.png" alt="PocaDex" width="360" />
</div>

# PocaDex

PocaDex is a web binder for K-pop photocard collectors. It helps you keep track of owned cards, wishlists, duplicates, cards on the way, and the little details that make a collection searchable: group, member, era, album, year, version, condition, notes, and images.

The app is built with React, Vite, Tailwind CSS, and Supabase.

## Features

- Supabase authentication with email/password and Google OAuth
- Personal photocard collection stored per user
- Binder views grouped by artist, member, era, album, or year
- Search, filters, sorting, and collection status tracking
- Add and edit photocards with image upload, crop, rotation, and zoom tools
- Bulk select and bulk edit for collection cleanup
- Scan/import flow for splitting grid template images into individual card crops
- Dashboard with collection counts, progress, duplicates, groups, and recent additions
- JSON export and import for collection backups
- Account profile settings, avatar upload, email/password updates, and account deletion recovery

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Supabase Auth, Database, and Storage
- `react-easy-crop` for image editing
- `lucide-react` for icons
- `motion` for UI animation

## Getting Started

### Prerequisites

- Node.js
- npm
- A Supabase project

### Install

```bash
npm install
```

### Environment Variables

Create a `.env.local` file based on `.env.example`:

```bash
VITE_SUPABASE_URL="https://your-project-ref.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key"
```

The project also contains a Gemini helper module and `.env.example` includes `GEMINI_API_KEY`, but the current scan flow uses local grid/template detection.

### Supabase Setup

PocaDex expects:

- A `photocards` table for collection entries
- A `profiles` table for user profile data
- A public Supabase Storage bucket named `photocard-images`
- Auth providers configured for email/password and, optionally, Google OAuth

The app maps photocard rows to these fields:

```text
id, user_id, group_name, member, album, era, year, card_name, version,
status, condition, is_duplicate, notes, image_url, created_at
```

Statuses used by the app are:

```text
owned, on_the_way, wishlist
```

Conditions used by the app are:

```text
mint, near_mint, good, fair, poor
```

For OAuth redirects, add this callback URL in Supabase:

```text
http://localhost:3000/auth/callback
```

Add your production domain callback as well when deploying.

## Development

Start the local dev server:

```bash
npm run dev
```

The app runs on:

```text
http://localhost:3000
```

Run TypeScript checks:

```bash
npm run lint
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Project Structure

```text
src/
  components/   Reusable UI, forms, grids, filters, backup controls
  contexts/     Supabase auth and profile state
  hooks/        Image upload helpers
  lib/          Supabase, database, backup, crop, image, and asset utilities
  pages/        App screens for auth, collection, dashboard, scan, account, details
  types.ts      Shared photocard and profile types
```

## Deployment

This project includes `netlify.toml` and can be deployed to Netlify or any Vite-compatible static hosting provider.

Before deploying, configure:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- Supabase auth redirect URLs for the deployed domain
- Supabase storage policies for `photocard-images`
