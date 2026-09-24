import { Effect, Layer } from "effect"
import { HttpApiBuilder } from "effect/unstable/httpapi"
import { Api } from "./api.ts"
import { ListingRepo } from "./listing-repo.ts"

const ListingsLive = HttpApiBuilder.group(Api, "listings", (handlers) =>
  Effect.gen(function*() {
    const repo = yield* ListingRepo
    return handlers
      .handle("create", ({ payload }) => repo.create(payload))
  }))

export const ApiLive = HttpApiBuilder.layer(Api).pipe(
  Layer.provide(ListingsLive)
)
