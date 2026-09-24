import { HttpApi, HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "effect/unstable/httpapi"
import {
  CreateListing,
  Listing,
  ListingId,
  ListingNotFound,
  UpdateListing
} from "./domain.ts"

const IdParams = { id: ListingId }

export class ListingsGroup extends HttpApiGroup.make("listings")
  .add(
    HttpApiEndpoint.post("create", "/listings", {
      payload: CreateListing,
      success: Listing.pipe(HttpApiSchema.status(201))
    }),
    HttpApiEndpoint.get("get", "/listings/:id", {
      params: IdParams,
      success: Listing,
      error: ListingNotFound
    }),
    HttpApiEndpoint.patch("update", "/listings/:id", {
      params: IdParams,
      payload: UpdateListing,
      success: Listing,
      error: ListingNotFound
    })
  )
{}

export class Api extends HttpApi.make("proptech")
  .add(ListingsGroup)
{}
