# Aisle Shopper API

Node/Express API for the Aisle Shopper app. It exposes `/api/v1` and stores list data in Postgres.

## Setup

1. Create a Postgres database.
2. Copy `api/.env.example` to `api/.env` and set `DATABASE_URL`.
3. If you started Postgres with the local Docker command, create the app database:

```bash
docker exec db createdb -U postgres aisle_shopper
```

4. Apply the schema:

```bash
docker cp api/schema.sql db:/tmp/schema.sql
docker exec db psql -U postgres -d aisle_shopper -f /tmp/schema.sql
```

Or, if `psql` is installed locally:

```bash
psql "$DATABASE_URL" -f api/schema.sql
```

5. Start the API from the repo root:

```bash
npm run api:dev
```

The Expo app reads `EXPO_PUBLIC_API_URL`; if unset it defaults to `http://localhost:3000`.
