import { describe, expect, it } from "@effect/vitest"
import { Exit, Schema } from "effect"
import { CreateListing } from "../src/domain.ts"

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
