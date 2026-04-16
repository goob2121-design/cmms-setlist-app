# Bluegrass Setlist Manager

A mobile-first live show management app for bluegrass and acoustic bands. This scaffold is built around Next.js App Router, Supabase PostgreSQL, and Supabase Realtime so band members can manage songs and setlists together during a show.

## Stack

- Next.js with React and TypeScript
- Supabase PostgreSQL for data storage
- Supabase Realtime for live sync
- Node.js API routes through Next.js route handlers

## Project Structure

```text
app/
  api/
  dashboard/
  live/
  setlists/
  songs/
components/
lib/
supabase/
```

## Local Setup

1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local`.
4. Create a Supabase project and paste your keys into `.env.local`.
5. Run the schema in `supabase/schema.sql` in the Supabase SQL editor.
6. In Supabase, enable Realtime for `setlists`, `setlist_items`, `live_sessions`, and `songs`.
7. Start the app with `npm run dev`.

## Export Notes

- `Printable` opens a clean print-friendly setlist page.
- `Export PDF` opens the same print-friendly page and triggers the browser print dialog so you can save as PDF.
- `Facebook text` and `Playlist` copy share-ready text directly to the clipboard.

## Current Scope

This first pass includes:

- Full project structure
- Database schema
- Shared domain types
- Initial dashboard pages
- Route handler stubs for core resources

Next implementation steps:

1. Connect the UI to Supabase queries and mutations.
2. Add Supabase Auth and user-aware row-level security flows.
3. Implement drag-and-drop setlist editing.
4. Add live mode realtime subscriptions.
5. Build export features for PDF and social text.
