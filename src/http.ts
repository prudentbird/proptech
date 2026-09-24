import { Effect, Layer, Option, SchemaIssue } from "effect"
import { HttpRouter, HttpServerResponse } from "effect/unstable/http"
import { HttpApiBuilder, HttpApiMiddleware, HttpApiScalar } from "effect/unstable/httpapi"
import { Api, RequestValidation } from "./api.ts"
import { ListingNotFound, pageMeta, ValidationError } from "./domain.ts"
import { ListingRepo } from "./listing-repo.ts"

const notFound = (id: string) => new ListingNotFound({ id, message: `Listing ${id} not found` })

const ListingsLive = HttpApiBuilder.group(Api, "listings", (handlers) =>
  Effect.gen(function*() {
    const repo = yield* ListingRepo
    return handlers
      .handle("create", ({ payload }) => repo.create(payload))
      .handle("list", ({ query }) =>
        repo.search(query).pipe(
          Effect.map(({ listings, total }) => ({
            data: listings,
            meta: pageMeta(query.page, query.pageSize, total)
          }))
        ))
      .handle("search", ({ query }) =>
        repo.search(query).pipe(
          Effect.map(({ listings, total }) => ({
            data: listings,
            meta: pageMeta(query.page, query.pageSize, total)
          }))
        ))
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
      .handle("delete", ({ params }) =>
        repo.remove(params.id).pipe(
          Effect.flatMap((deleted) => deleted ? Effect.void : Effect.fail(notFound(params.id)))
        ))
  }))

const HealthLive = HttpApiBuilder.group(Api, "health", (handlers) =>
  handlers.handle("health", () => Effect.succeed({ status: "ok" as const })))

const formatIssues = SchemaIssue.makeFormatterStandardSchemaV1()

const formatPath = (path: ReadonlyArray<PropertyKey | { readonly key: PropertyKey }> | undefined) =>
  (path ?? []).map((segment) => String(typeof segment === "object" ? segment.key : segment)).join(".")

const RequestValidationLive = HttpApiMiddleware.layerSchemaErrorTransform(
  RequestValidation,
  (error) =>
    error.kind === "Body" || error.kind === "ResponseHeaders"
      ? Effect.fail(error)
      : Effect.fail(
        new ValidationError({
          message: `Invalid request ${error.kind.toLowerCase()}`,
          issues: formatIssues(error.cause.issue).issues.map((issue) => ({
            path: formatPath(issue.path),
            message: issue.message
          }))
        })
      )
)

export const ApiLive = Layer.mergeAll(
  HttpApiBuilder.layer(Api, { openapiPath: "/openapi.json" }),
  HttpApiScalar.layer(Api, { path: "/docs" }),
  HttpRouter.add("GET", "/", HttpServerResponse.redirect("/docs"))
).pipe(
  Layer.provide([ListingsLive, HealthLive]),
  Layer.provide(RequestValidationLive),
  Layer.provide(HttpRouter.cors())
)
