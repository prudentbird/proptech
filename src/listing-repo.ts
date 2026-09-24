import { Context, Effect, Layer } from "effect"
import { SqlClient } from "effect/unstable/sql"
import type { CreateListing, Listing, ListingType } from "./domain.ts"

interface ListingRow {
  readonly id: string
  readonly title: string
  readonly price: bigint
  readonly type: ListingType
  readonly bedrooms: number
  readonly lat: number
  readonly lng: number
  readonly address: string | null
  readonly agentId: string
  readonly createdAt: Date
  readonly updatedAt: Date
  readonly distanceKm?: number
}

const toListing = (row: ListingRow): Listing => ({
  id: row.id,
  title: row.title,
  price: Number(row.price),
  type: row.type,
  bedrooms: row.bedrooms,
  location: { lat: row.lat, lng: row.lng, address: row.address },
  agentId: row.agentId,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  ...(row.distanceKm === undefined ? {} : { distanceKm: Math.round(row.distanceKm * 1000) / 1000 })
})

export class ListingRepo extends Context.Service<ListingRepo, {
  readonly create: (input: CreateListing) => Effect.Effect<Listing>
}>()("ListingRepo") {}

export const ListingRepoLive = Layer.effect(
  ListingRepo,
  Effect.gen(function*() {
    const sql = yield* SqlClient.SqlClient

    const create = (input: CreateListing) =>
      sql<ListingRow>`
        INSERT INTO listings ${
        sql.insert({
          title: input.title,
          price: input.price,
          type: input.type,
          bedrooms: input.bedrooms,
          lat: input.location.lat,
          lng: input.location.lng,
          address: input.location.address ?? null,
          agentId: input.agentId
        })
      }
        RETURNING *
      `.pipe(Effect.map(([row]) => toListing(row!)), Effect.orDie)

    return { create }
  })
)
