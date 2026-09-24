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

## Design choices

I kept things simple and avoided extra layers I didn't need.

- **One definition for each endpoint.** I describe each endpoint's inputs and outputs once. That same description checks incoming requests, generates the docs page and gives the tests a ready-made client, so they can't drift apart.
- **Helpful errors.** If a request has several problems, the response lists all of them and says which field each one belongs to, so a form can show every error at once. A listing that doesn't exist returns a 404.
- **Fast distance search without extra tools.** I used an extension that comes with PostgreSQL to index each listing's location. A search first picks out listings inside a rough box around the point, which is fast, then checks the exact distance. Results come back nearest first with their distance in km.
- **Real database in tests.** The tests start the actual server and run against a real PostgreSQL database, so they check what users will actually get.
- **Checks in two places.** The API rejects bad input, and the database has the same rules, so bad data can't get in another way.
