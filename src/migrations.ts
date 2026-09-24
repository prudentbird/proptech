import { Effect } from "effect"
import { Migrator, SqlClient } from "effect/unstable/sql"

const createListings = Effect.gen(function*() {
  const sql = yield* SqlClient.SqlClient
  yield* sql`
    CREATE TABLE listings (
      id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      title       text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 200),
      price       bigint NOT NULL CHECK (price >= 0),
      type        text NOT NULL CHECK (type IN ('rent', 'sale', 'shortlet')),
      bedrooms    smallint NOT NULL CHECK (bedrooms BETWEEN 0 AND 50),
      lat         double precision NOT NULL CHECK (lat BETWEEN -90 AND 90),
      lng         double precision NOT NULL CHECK (lng BETWEEN -180 AND 180),
      address     text,
      agent_id    text NOT NULL,
      created_at  timestamptz NOT NULL DEFAULT now(),
      updated_at  timestamptz NOT NULL DEFAULT now()
    )
  `
  yield* sql`CREATE INDEX listings_type_price_idx ON listings (type, price)`
  yield* sql`CREATE INDEX listings_bedrooms_idx ON listings (bedrooms)`
  yield* sql`CREATE INDEX listings_agent_id_idx ON listings (agent_id)`
  yield* sql`CREATE INDEX listings_created_at_idx ON listings (created_at DESC, id DESC)`
})

export const runMigrations = Migrator.make({})({
  loader: Migrator.fromRecord({
    "0001_create_listings": createListings
  })
})
