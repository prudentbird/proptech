import { Schema } from "effect"
import { HttpApi, HttpApiEndpoint, HttpApiGroup, HttpApiMiddleware, HttpApiSchema } from "effect/unstable/httpapi"
import {
  CreateListing,
  Listing,
  ListingId,
  ListingNotFound,
  ListingPage,
  ListQuery,
  SearchQuery,
  UpdateListing,
  ValidationError
} from "./domain.ts"

const IdParams = { id: ListingId }

export class ListingsGroup extends HttpApiGroup.make("listings")
  .add(
    HttpApiEndpoint.post("create", "/listings", {
      payload: CreateListing,
      success: Listing.pipe(HttpApiSchema.status(201))
    }),
    HttpApiEndpoint.get("list", "/listings", {
      query: ListQuery,
      success: ListingPage
    }),
    HttpApiEndpoint.get("search", "/listings/search", {
      query: SearchQuery,
      success: ListingPage
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
    }),
    HttpApiEndpoint.delete("delete", "/listings/:id", {
      params: IdParams,
      error: ListingNotFound
    })
  )
{}

export class HealthGroup extends HttpApiGroup.make("health").add(
  HttpApiEndpoint.get("health", "/health", {
    success: Schema.Struct({ status: Schema.Literal("ok") })
  })
) {}

export class RequestValidation extends HttpApiMiddleware.Service<RequestValidation>()("RequestValidation", {
  error: ValidationError
}) {}

export class Api extends HttpApi.make("proptech")
  .add(ListingsGroup)
  .add(HealthGroup)
  .middleware(RequestValidation)
{}
