import { Schema } from "effect"

export const ListingType = Schema.Literals(["rent", "sale", "shortlet"])
export type ListingType = typeof ListingType.Type

export const ListingId = Schema.String.check(Schema.isUUID())

const Latitude = Schema.Finite.check(Schema.isBetween({ minimum: -90, maximum: 90 }))
const Longitude = Schema.Finite.check(Schema.isBetween({ minimum: -180, maximum: 180 }))

const Title = Schema.Trim.check(Schema.isLengthBetween(3, 200))
const Price = Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: 1_000_000_000_000 }))
const Bedrooms = Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: 50 }))
const AgentId = Schema.Trim.check(Schema.isLengthBetween(1, 64))
const Address = Schema.Trim.check(Schema.isLengthBetween(1, 300))

export const LocationInput = Schema.Struct({
  lat: Latitude,
  lng: Longitude,
  address: Schema.optionalKey(Schema.NullOr(Address))
})

export const CreateListing = Schema.Struct({
  title: Title,
  price: Price,
  type: ListingType,
  bedrooms: Bedrooms,
  location: LocationInput,
  agentId: AgentId
})
export type CreateListing = typeof CreateListing.Type

export const UpdateListing = Schema.Struct({
  title: Schema.optionalKey(Title),
  price: Schema.optionalKey(Price),
  type: Schema.optionalKey(ListingType),
  bedrooms: Schema.optionalKey(Bedrooms),
  location: Schema.optionalKey(LocationInput),
  agentId: Schema.optionalKey(AgentId)
}).check(
  Schema.makeFilter((input) => Object.keys(input).length > 0 || "Provide at least one field to update")
)
export type UpdateListing = typeof UpdateListing.Type
