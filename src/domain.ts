import { Effect, Schema } from "effect"

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

export const Listing = Schema.Struct({
  id: ListingId,
  title: Schema.String,
  price: Schema.Number,
  type: ListingType,
  bedrooms: Schema.Number,
  location: Schema.Struct({
    lat: Schema.Number,
    lng: Schema.Number,
    address: Schema.NullOr(Schema.String)
  }),
  agentId: Schema.String,
  createdAt: Schema.Date,
  updatedAt: Schema.Date,
  distanceKm: Schema.optionalKey(Schema.Number)
})
export type Listing = typeof Listing.Type

export const DEFAULT_PAGE_SIZE = 20

export const Pagination = {
  page: Schema.Int.check(Schema.isGreaterThanOrEqualTo(1)).pipe(
    Schema.withDecodingDefaultKey(Effect.succeed(1))
  ),
  pageSize: Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 100 })).pipe(
    Schema.withDecodingDefaultKey(Effect.succeed(DEFAULT_PAGE_SIZE))
  )
}

export const ListQuery = Schema.Struct(Pagination)
export type ListQuery = typeof ListQuery.Type

const NonNegative = Schema.Finite.check(Schema.isGreaterThanOrEqualTo(0))

export const MAX_RADIUS_KM = 500

export const SearchQuery = Schema.Struct({
  type: Schema.optionalKey(ListingType),
  minPrice: Schema.optionalKey(NonNegative),
  maxPrice: Schema.optionalKey(NonNegative),
  minBedrooms: Schema.optionalKey(Bedrooms),
  maxBedrooms: Schema.optionalKey(Bedrooms),
  lat: Schema.optionalKey(Latitude),
  lng: Schema.optionalKey(Longitude),
  radiusKm: Schema.optionalKey(
    Schema.Finite.check(Schema.isGreaterThan(0), Schema.isLessThanOrEqualTo(MAX_RADIUS_KM))
  ),
  ...Pagination
}).check(
  Schema.makeFilter((q) => {
    const issues: Array<Schema.FilterIssue> = []
    if (q.minPrice !== undefined && q.maxPrice !== undefined && q.minPrice > q.maxPrice) {
      issues.push({ path: ["maxPrice"], issue: "maxPrice must be greater than or equal to minPrice" })
    }
    if (q.minBedrooms !== undefined && q.maxBedrooms !== undefined && q.minBedrooms > q.maxBedrooms) {
      issues.push({ path: ["maxBedrooms"], issue: "maxBedrooms must be greater than or equal to minBedrooms" })
    }
    const geo = [q.lat, q.lng, q.radiusKm].filter((v) => v !== undefined).length
    if (geo !== 0 && geo !== 3) {
      issues.push({ path: ["radiusKm"], issue: "lat, lng and radiusKm must be provided together" })
    }
    return issues
  })
)
export type SearchQuery = typeof SearchQuery.Type

export const PageMeta = Schema.Struct({
  page: Schema.Number,
  pageSize: Schema.Number,
  total: Schema.Number,
  totalPages: Schema.Number
})

export const ListingPage = Schema.Struct({
  data: Schema.Array(Listing),
  meta: PageMeta
})
export type ListingPage = typeof ListingPage.Type

export const pageMeta = (page: number, pageSize: number, total: number): typeof PageMeta.Type => ({
  page,
  pageSize,
  total,
  totalPages: Math.ceil(total / pageSize)
})
