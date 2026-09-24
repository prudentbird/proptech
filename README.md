# proptech

A small API for property listings. You can create, view, update and delete listings, and search them by type, price, number of bedrooms and distance from a point. Built with TypeScript, [Effect](https://effect.website) and PostgreSQL.

## Setup

You'll need Node 24+, pnpm and PostgreSQL.

```bash
pnpm install
createdb proptech && createdb proptech_test
cp .env.example .env

pnpm seed
pnpm dev
pnpm test
```

`pnpm seed` adds 195 sample listings across Lagos, Abuja, Ibadan and Port Harcourt. `pnpm dev` starts the server at http://localhost:3000. Open http://localhost:3000/docs to see and try every endpoint. `pnpm test` runs the tests.
