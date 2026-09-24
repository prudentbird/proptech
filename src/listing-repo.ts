import { Context, Effect, Layer, Option } from "effect"
import { SqlClient } from "effect/unstable/sql"
import type { CreateListing, Listing, ListingType, SearchQuery, UpdateListing } from "./domain.ts"

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

export interface SearchResult {
  readonly listings: ReadonlyArray<Listing>
  readonly total: number
}

export class ListingRepo extends Context.Service<ListingRepo, {
  readonly create: (input: CreateListing) => Effect.Effect<Listing>
  readonly findById: (id: string) => Effect.Effect<Option.Option<Listing>>
  readonly update: (id: string, patch: UpdateListing) => Effect.Effect<Option.Option<Listing>>
  readonly remove: (id: string) => Effect.Effect<boolean>
  readonly search: (query: Partial<SearchQuery> & Pick<SearchQuery, "page" | "pageSize">) => Effect.Effect<SearchResult>
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

    const findById = (id: string) =>
      sql<ListingRow>`SELECT * FROM listings WHERE id = ${id}`.pipe(
        Effect.map((rows) => Option.fromNullishOr(rows[0]).pipe(Option.map(toListing))),
        Effect.orDie
      )

    const update = (id: string, patch: UpdateListing) => {
      const fields: Record<string, unknown> = {}
      if (patch.title !== undefined) fields.title = patch.title
      if (patch.price !== undefined) fields.price = patch.price
      if (patch.type !== undefined) fields.type = patch.type
      if (patch.bedrooms !== undefined) fields.bedrooms = patch.bedrooms
      if (patch.agentId !== undefined) fields.agentId = patch.agentId
      if (patch.location !== undefined) {
        fields.lat = patch.location.lat
        fields.lng = patch.location.lng
        if ("address" in patch.location) fields.address = patch.location.address ?? null
      }
      return sql<ListingRow>`
        UPDATE listings SET ${sql.update(fields)}, updated_at = now()
        WHERE id = ${id}
        RETURNING *
      `.pipe(
        Effect.map((rows) => Option.fromNullishOr(rows[0]).pipe(Option.map(toListing))),
        Effect.orDie
      )
    }

    const remove = (id: string) =>
      sql`DELETE FROM listings WHERE id = ${id} RETURNING id`.pipe(
        Effect.map((rows) => rows.length > 0),
        Effect.orDie
      )

    const search = (q: Partial<SearchQuery> & Pick<SearchQuery, "page" | "pageSize">) => {
      const conditions = []
      if (q.type !== undefined) conditions.push(sql`type = ${q.type}`)
      if (q.minPrice !== undefined) conditions.push(sql`price >= ${q.minPrice}`)
      if (q.maxPrice !== undefined) conditions.push(sql`price <= ${q.maxPrice}`)
      if (q.minBedrooms !== undefined) conditions.push(sql`bedrooms >= ${q.minBedrooms}`)
      if (q.maxBedrooms !== undefined) conditions.push(sql`bedrooms <= ${q.maxBedrooms}`)

      const where = conditions.length > 0 ? sql`WHERE ${sql.and(conditions)}` : sql``
      const offset = (q.page - 1) * q.pageSize

      return Effect.all({
        rows: sql<ListingRow>`
          SELECT * FROM listings ${where}
          ORDER BY created_at DESC, id DESC
          LIMIT ${q.pageSize} OFFSET ${offset}
        `,
        count: sql<{ readonly total: bigint }>`SELECT count(*) AS total FROM listings ${where}`
      }, { concurrency: 2 }).pipe(
        Effect.map(({ count, rows }) => ({ listings: rows.map(toListing), total: Number(count[0]!.total) })),
        Effect.orDie
      )
    }

    return { create, findById, update, remove, search }
  })
)
