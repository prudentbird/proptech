import { PgClient } from "@effect/sql-pg"
import { Layer, Redacted, String } from "effect"
import { runMigrations } from "./migrations.ts"

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
