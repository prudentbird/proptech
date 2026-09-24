import { describe, expect, it } from "@effect/vitest"
import { Exit, Schema } from "effect"
import { CreateListing, pageMeta, SearchQuery, UpdateListing } from "../src/domain.ts"

const decode = <S extends Schema.Top & { readonly DecodingServices: never }>(schema: S) => (input: unknown) =>
  Schema.decodeUnknownExit(schema)(input, { errors: "all" })

const validListing = {
  title: "2 Bed Flat in Yaba",
  price: 1_500_000,
  type: "rent",
  bedrooms: 2,
  location: { lat: 6.5095, lng: 3.3711 },
  agentId: "agent-1"
}

describe("CreateListing", () => {
  it("accepts a valid listing and trims strings", () => {
    const exit = decode(CreateListing)({ ...validListing, title: "  2 Bed Flat in Yaba  " })
    expect(Exit.isSuccess(exit) && exit.value.title).toBe("2 Bed Flat in Yaba")
  })

  it.each([
    ["unknown type", { type: "lease" }],
    ["negative price", { price: -1 }],
    ["fractional bedrooms", { bedrooms: 1.5 }],
    ["latitude out of range", { location: { lat: 91, lng: 3 } }],
    ["longitude out of range", { location: { lat: 6, lng: -181 } }],
    ["blank title", { title: "   " }],
    ["blank agent", { agentId: "" }]
  ])("rejects %s", (_, override) => {
    expect(Exit.isFailure(decode(CreateListing)({ ...validListing, ...override }))).toBe(true)
  })
})

describe("UpdateListing", () => {
  it("rejects an empty patch", () => {
    expect(Exit.isFailure(decode(UpdateListing)({}))).toBe(true)
  })

  it("accepts a partial patch", () => {
    expect(Exit.isSuccess(decode(UpdateListing)({ price: 2_000_000 }))).toBe(true)
  })
})

describe("SearchQuery", () => {
  it("defaults pagination", () => {
    const exit = decode(SearchQuery)({})
    expect(Exit.isSuccess(exit) && exit.value).toEqual({ page: 1, pageSize: 20 })
  })

  it("accepts a full geo + filter query", () => {
    const query = { type: "sale", minPrice: 0, maxPrice: 10, minBedrooms: 1, maxBedrooms: 3, lat: 6.5, lng: 3.3, radiusKm: 5 }
    expect(Exit.isSuccess(decode(SearchQuery)(query))).toBe(true)
  })

  it.each([
    ["min price above max price", { minPrice: 10, maxPrice: 5 }],
    ["min bedrooms above max bedrooms", { minBedrooms: 4, maxBedrooms: 2 }],
    ["lat/lng without radius", { lat: 6.5, lng: 3.3 }],
    ["radius without a point", { radiusKm: 5 }],
    ["radius above the cap", { lat: 6.5, lng: 3.3, radiusKm: 501 }],
    ["zero radius", { lat: 6.5, lng: 3.3, radiusKm: 0 }],
    ["page size above 100", { pageSize: 101 }],
    ["page 0", { page: 0 }]
  ])("rejects %s", (_, query) => {
    expect(Exit.isFailure(decode(SearchQuery)(query))).toBe(true)
  })
})

describe("pageMeta", () => {
  it("computes total pages", () => {
    expect(pageMeta(1, 20, 0)).toEqual({ page: 1, pageSize: 20, total: 0, totalPages: 0 })
    expect(pageMeta(2, 20, 41)).toEqual({ page: 2, pageSize: 20, total: 41, totalPages: 3 })
  })
})
