import { Schema } from "effect"

export const ListingType = Schema.Literals(["rent", "sale", "shortlet"])
export type ListingType = typeof ListingType.Type

export const ListingId = Schema.String.check(Schema.isUUID())
