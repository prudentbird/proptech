import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Config, Effect, Layer } from "effect"
import { HttpRouter } from "effect/unstable/http"
import { createServer } from "node:http"
import { DatabaseLive, DatabaseUrl } from "./database.ts"
import { ApiLive } from "./http.ts"
import { ListingRepoLive } from "./listing-repo.ts"

const AppConfig = Config.all({
  port: Config.Port("PORT").pipe(Config.withDefault(3000)),
  databaseUrl: DatabaseUrl
})

const MainLive = Layer.unwrap(
  Effect.gen(function*() {
    const { databaseUrl, port } = yield* AppConfig
    return HttpRouter.serve(ApiLive).pipe(
      Layer.provide(ListingRepoLive),
      Layer.provide(DatabaseLive(databaseUrl)),
      Layer.provide(NodeHttpServer.layer(createServer, { port }))
    )
  })
)

Layer.launch(MainLive).pipe(NodeRuntime.runMain)
