import { NodeHttpServer } from "@effect/platform-node"
import { assert, describe, expect, layer } from "@effect/vitest"
import { Config, Effect, Layer, Redacted } from "effect"
import { HttpRouter } from "effect/unstable/http"
import { HttpApiClient } from "effect/unstable/httpapi"
import { SqlClient } from "effect/unstable/sql"
import { Api } from "../src/api.ts"
import { DatabaseLive } from "../src/database.ts"
import type { CreateListing } from "../src/domain.ts"
import { ApiLive } from "../src/http.ts"
import { ListingRepoLive } from "../src/listing-repo.ts"

const TestDatabaseUrl = Config.Redacted("TEST_DATABASE_URL").pipe(
  Config.withDefault(Redacted.make("postgres://localhost:5432/proptech_test"))
)

const TestLive = Layer.unwrap(
  Effect.gen(function*() {
    const url = yield* TestDatabaseUrl
    return HttpRouter.serve(ApiLive, { disableListenLog: true, disableLogger: true }).pipe(
      Layer.provide(ListingRepoLive),
      Layer.provideMerge(DatabaseLive(url)),
      Layer.provideMerge(NodeHttpServer.layerTest)
    )
  })
)

const lekki = { lat: 6.4474, lng: 3.4723 }

const fixtures: Record<string, CreateListing> = {
  lekki: {
    title: "3 Bed Flat in Lekki Phase 1",
    price: 4_500_000,
    type: "rent",
    bedrooms: 3,
    location: { ...lekki, address: "Admiralty Way" },
    agentId: "agent-1"
  },
  vi: {
    title: "Shortlet in Victoria Island",
    price: 85_000,
    type: "shortlet",
    bedrooms: 2,
    location: { lat: 6.4281, lng: 3.4219 },
    agentId: "agent-2"
  },
  yaba: {
    title: "Studio in Yaba",
    price: 1_200_000,
    type: "rent",
    bedrooms: 1,
    location: { lat: 6.5095, lng: 3.3711 },
    agentId: "agent-1"
  },
  maitama: {
    title: "Duplex in Maitama",
    price: 250_000_000,
    type: "sale",
    bedrooms: 5,
    location: { lat: 9.082, lng: 7.4951 },
    agentId: "agent-3"
  }
}

const setup = Effect.gen(function*() {
  const sql = yield* SqlClient.SqlClient
  yield* sql`TRUNCATE listings`
  const client = yield* HttpApiClient.make(Api)
  return client
})

const seed = Effect.gen(function*() {
  const client = yield* setup
  for (const payload of Object.values(fixtures)) {
    yield* client.listings.create({ payload })
  }
  return client
})

const titles = (page: { readonly data: ReadonlyArray<{ readonly title: string }> }) => page.data.map((l) => l.title)

layer(TestLive)("Listings API", (it) => {
  describe("CRUD", () => {
    it.effect("creates and fetches a listing", () =>
      Effect.gen(function*() {
        const client = yield* setup
        const created = yield* client.listings.create({ payload: fixtures.lekki! })
        expect(created).toMatchObject({ ...fixtures.lekki, id: expect.any(String) })

        const fetched = yield* client.listings.get({ params: { id: created.id } })
        expect(fetched).toEqual(created)
      }))

    it.effect("updates a listing partially", () =>
      Effect.gen(function*() {
        const client = yield* setup
        const created = yield* client.listings.create({ payload: fixtures.lekki! })
        const updated = yield* client.listings.update({
          params: { id: created.id },
          payload: { price: 5_000_000, location: { lat: 6.45, lng: 3.47 } }
        })
        expect(updated.price).toBe(5_000_000)
        expect(updated.title).toBe(created.title)
        expect(updated.location).toEqual({ lat: 6.45, lng: 3.47, address: "Admiralty Way" })
        expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(created.updatedAt.getTime())
      }))

    it.effect("deletes a listing", () =>
      Effect.gen(function*() {
        const client = yield* setup
        const created = yield* client.listings.create({ payload: fixtures.lekki! })
        yield* client.listings.delete({ params: { id: created.id } })
        const error = yield* client.listings.get({ params: { id: created.id } }).pipe(Effect.flip)
        assert.strictEqual(error._tag, "ListingNotFound")
      }))

    it.effect("returns 404 for unknown ids on get, update and delete", () =>
      Effect.gen(function*() {
        const client = yield* setup
        const id = "00000000-0000-4000-8000-000000000000"
        const errors = yield* Effect.all([
          client.listings.get({ params: { id } }).pipe(Effect.flip),
          client.listings.update({ params: { id }, payload: { price: 1 } }).pipe(Effect.flip),
          client.listings.delete({ params: { id } }).pipe(Effect.flip)
        ])
        expect(errors.map((e) => e._tag)).toEqual(["ListingNotFound", "ListingNotFound", "ListingNotFound"])
      }))

    it.effect("paginates newest first", () =>
      Effect.gen(function*() {
        const client = yield* seed
        const first = yield* client.listings.list({ query: { page: 1, pageSize: 3 } })
        const second = yield* client.listings.list({ query: { page: 2, pageSize: 3 } })
        expect(first.meta).toEqual({ page: 1, pageSize: 3, total: 4, totalPages: 2 })
        expect(titles(first)).toEqual(["Duplex in Maitama", "Studio in Yaba", "Shortlet in Victoria Island"])
        expect(titles(second)).toEqual(["3 Bed Flat in Lekki Phase 1"])
      }))
  })
})
