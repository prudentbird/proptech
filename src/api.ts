import { HttpApi, HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "effect/unstable/httpapi"
import {
  CreateListing,
  Listing
} from "./domain.ts"

export class ListingsGroup extends HttpApiGroup.make("listings")
  .add(
    HttpApiEndpoint.post("create", "/listings", {
      payload: CreateListing,
      success: Listing.pipe(HttpApiSchema.status(201))
    })
  )
{}

export class Api extends HttpApi.make("proptech")
  .add(ListingsGroup)
{}
