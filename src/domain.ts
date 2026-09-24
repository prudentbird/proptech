import { Schema } from "effect"

export const ListingType = Schema.Literals(["rent", "sale", "shortlet"])
export type ListingType = typeof ListingType.Type

export const ListingId = Schema.String.check(Schema.isUUID())

const Latitude = Schema.Finite.check(Schema.isBetween({ minimum: -90, maximum: 90 }))
const Longitude = Schema.Finite.check(Schema.isBetween({ minimum: -180, maximum: 180 }))
const Address = Schema.Trim.check(Schema.isLengthBetween(1, 300))

export const LocationInput = Schema.Struct({
  lat: Latitude,
  lng: Longitude,
  address: Schema.optionalKey(Schema.NullOr(Address))
})
