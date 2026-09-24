import { NodeRuntime } from "@effect/platform-node"
import { Console, Effect, Layer } from "effect"
import { SqlClient } from "effect/unstable/sql"
import { DatabaseLive, DatabaseUrl } from "./database.ts"
import type { CreateListing } from "./domain.ts"
import { ListingRepo, ListingRepoLive } from "./listing-repo.ts"

interface Area {
  readonly name: string
  readonly city: string
  readonly lat: number
  readonly lng: number
  readonly yearlyRent: number
  readonly salePrice: number
  readonly nightlyRate: number
}

const areas: ReadonlyArray<Area> = [
  { name: "Lekki Phase 1", city: "Lagos", lat: 6.4474, lng: 3.4723, yearlyRent: 6_000_000, salePrice: 180_000_000, nightlyRate: 90_000 },
  { name: "Victoria Island", city: "Lagos", lat: 6.4281, lng: 3.4219, yearlyRent: 9_000_000, salePrice: 300_000_000, nightlyRate: 120_000 },
  { name: "Ikoyi", city: "Lagos", lat: 6.4549, lng: 3.4346, yearlyRent: 12_000_000, salePrice: 450_000_000, nightlyRate: 150_000 },
  { name: "Ajah", city: "Lagos", lat: 6.4698, lng: 3.5852, yearlyRent: 2_500_000, salePrice: 65_000_000, nightlyRate: 45_000 },
  { name: "Yaba", city: "Lagos", lat: 6.5095, lng: 3.3711, yearlyRent: 1_800_000, salePrice: 55_000_000, nightlyRate: 35_000 },
  { name: "Surulere", city: "Lagos", lat: 6.5009, lng: 3.3558, yearlyRent: 1_500_000, salePrice: 45_000_000, nightlyRate: 30_000 },
  { name: "Ikeja GRA", city: "Lagos", lat: 6.5833, lng: 3.35, yearlyRent: 4_500_000, salePrice: 150_000_000, nightlyRate: 70_000 },
  { name: "Gbagada", city: "Lagos", lat: 6.5536, lng: 3.3886, yearlyRent: 2_000_000, salePrice: 60_000_000, nightlyRate: 40_000 },
  { name: "Maitama", city: "Abuja", lat: 9.082, lng: 7.4951, yearlyRent: 10_000_000, salePrice: 400_000_000, nightlyRate: 130_000 },
  { name: "Asokoro", city: "Abuja", lat: 9.0437, lng: 7.5277, yearlyRent: 9_000_000, salePrice: 350_000_000, nightlyRate: 120_000 },
  { name: "Wuse 2", city: "Abuja", lat: 9.0765, lng: 7.4735, yearlyRent: 5_000_000, salePrice: 160_000_000, nightlyRate: 75_000 },
  { name: "Gwarinpa", city: "Abuja", lat: 9.1082, lng: 7.4127, yearlyRent: 2_500_000, salePrice: 80_000_000, nightlyRate: 45_000 },
  { name: "Jabi", city: "Abuja", lat: 9.0667, lng: 7.4333, yearlyRent: 3_500_000, salePrice: 120_000_000, nightlyRate: 60_000 }
]

const homeKinds = [
  { label: "Self Contain", bedrooms: 0 },
  { label: "1 Bedroom Flat", bedrooms: 1 },
  { label: "2 Bedroom Flat", bedrooms: 2 },
  { label: "3 Bedroom Flat", bedrooms: 3 },
  { label: "4 Bedroom Terrace", bedrooms: 4 },
  { label: "5 Bedroom Detached Duplex", bedrooms: 5 }
]

const agents = ["agent-adaeze", "agent-tunde", "agent-halima", "agent-emeka", "agent-bisola"]

const roundTo = (value: number, step: number) => Math.round(value / step) * step

const listingsFor = (area: Area, areaIndex: number): Array<CreateListing> =>
  homeKinds.flatMap((kind, kindIndex) => {
    const i = areaIndex * homeKinds.length + kindIndex
    const size = 0.6 + kind.bedrooms * 0.35
    const location = {
      lat: Number((area.lat + ((i * 37) % 11 - 5) * 0.002).toFixed(6)),
      lng: Number((area.lng + ((i * 53) % 11 - 5) * 0.002).toFixed(6)),
      address: `${area.name}, ${area.city}`
    }
    const agentId = agents[i % agents.length]!
    const listing = (type: CreateListing["type"], price: number): CreateListing => ({
      title: `${kind.label} ${type === "sale" ? "for sale" : type === "shortlet" ? "shortlet" : "for rent"} in ${area.name}`,
      price,
      type,
      bedrooms: kind.bedrooms,
      location,
      agentId
    })
    const types: Array<CreateListing> = [listing("rent", roundTo(area.yearlyRent * size, 50_000))]
    if (kind.bedrooms >= 2) types.push(listing("sale", roundTo(area.salePrice * size, 1_000_000)))
    if (kind.bedrooms >= 1 && kind.bedrooms <= 3) types.push(listing("shortlet", roundTo(area.nightlyRate * size, 5_000)))
    return types
  })

const seed = Effect.gen(function*() {
  const sql = yield* SqlClient.SqlClient
  const repo = yield* ListingRepo
  const listings = areas.flatMap(listingsFor)

  yield* sql.withTransaction(
    Effect.gen(function*() {
      yield* sql`TRUNCATE listings`
      yield* Effect.forEach(listings, repo.create, { discard: true })
    })
  )

  yield* Console.log(`Seeded ${listings.length} listings across ${areas.length} areas`)
})

const SeedLive = Layer.unwrap(
  Effect.gen(function*() {
    const url = yield* DatabaseUrl
    return ListingRepoLive.pipe(Layer.provideMerge(DatabaseLive(url)))
  })
)

seed.pipe(Effect.provide(SeedLive), NodeRuntime.runMain)
