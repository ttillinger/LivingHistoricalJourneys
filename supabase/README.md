# Supabase

Auth, Postgres (+ RLS), Realtime, and Storage for the app (HANDOFF.md §3, §10).

Migrations here are the source of truth for the schema. `config.toml` is created by
`supabase init` on your machine and is not committed until you run it.

## First-time setup

```bash
# Install the CLI: https://supabase.com/docs/guides/cli
supabase init          # generates supabase/config.toml
supabase start         # local stack (Docker)
supabase db reset      # applies migrations/*.sql from scratch, then seed.sql
```

## Linking to the hosted project

```bash
supabase link --project-ref <your-project-ref>
supabase db push       # apply pending migrations to the hosted database
```

## Conventions

- One migration file per change, prefixed with a zero-padded ordinal.
- Enable RLS and write policies **in the same migration** as the table.
- Never edit a migration that has already been applied to a shared environment —
  add a new one.
