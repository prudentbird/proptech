import { Effect, Layer, Option } from "effect"
import { HttpApiBuilder } from "effect/unstable/httpapi"
import { Api } from "./api.ts"
import { ListingNotFound } from "./domain.ts"
import { ListingRepo } from "./listing-repo.ts"

const notFound = (id: string) => new ListingNotFound({ id, message: `Listing ${id} not found` })

const ListingsLive = HttpApiBuilder.group(Api, "listings", (handlers) =>
  Effect.gen(function*() {
    const repo = yield* ListingRepo
    return handlers
      .handle("create", ({ payload }) => repo.create(payload))
      .handle("get", ({ params }) =>
        repo.findById(params.id).pipe(
          Effect.flatMap(Option.match({
            onNone: () => Effect.fail(notFound(params.id)),
            onSome: Effect.succeed
          }))
        ))
      .handle("update", ({ params, payload }) =>
        repo.update(params.id, payload).pipe(
          Effect.flatMap(Option.match({
            onNone: () => Effect.fail(notFound(params.id)),
            onSome: Effect.succeed
          }))
        ))
  }))

export const ApiLive = HttpApiBuilder.layer(Api).pipe(
  Layer.provide(ListingsLive)
)
