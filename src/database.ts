import { PgClient } from "@effect/sql-pg"
import { Config, Layer, Redacted, String } from "effect"
import { runMigrations } from "./migrations.ts"

export const DatabaseUrl = Config.Redacted("DATABASE_URL").pipe(
  Config.withDefault(Redacted.make("postgres://localhost:5432/proptech"))
)

export const DatabaseLive = (url: Redacted.Redacted) =>
  Layer.effectDiscard(runMigrations).pipe(
    Layer.provideMerge(
      PgClient.layer({
        url,
        transformQueryNames: String.camelToSnake,
        transformResultNames: String.snakeToCamel
      })
    )
  )
