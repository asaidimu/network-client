# [2.0.0](https://github.com/asaidimu/network-client/compare/v1.0.0...v2.0.0) (2025-05-24)


* feat(client)!: introduce comprehensive network client with advanced features ([4833151](https://github.com/asaidimu/network-client/commit/48331514f2c17dd46a6b73224c23c035ed4b3fbf))
* refactor(types)!: refine public type exports and internal type handling ([a21d251](https://github.com/asaidimu/network-client/commit/a21d25127df3e4cb7a9a304497124316f12d755b))


### BREAKING CHANGES

* The NetworkClient interface is no longer directly exported from @asaidimu/network-client.
Previously, consumers could import it via `import type { NetworkClient } from '@asaidimu/network-client'`.
Now, you can infer the type from `createNetworkClient` function's return:
`import { createNetworkClient } from '@asaidimu/network-client';`
`type MyClient = ReturnType<typeof createNetworkClient>;`
This also impacts `BaseSDK`'s internal import of `NetworkClient` and may require an update to its type import strategy.
* This release introduces extensive changes to the client's API and configuration interfaces, and assumes a package name change from ts-network-client to @asaidimu/network-client.

Specific breaking changes include:
- The NetworkClientConfig interface has been significantly updated. The responseHandler option has been removed, and new configuration options for retry, cache, interceptors, defaultResponseType, and defaultBodyType have been added. Existing client configurations will need to be updated.
- The Middleware interface has been redesigned. Lifecycle hooks such as beforeRequest/afterRequest and beforeResponse/afterResponse have been updated, and a new onError hook has been introduced. Custom middleware implementations will require refactoring.
- The ApiResponse structure has changed. The status field is now mandatory (not optional), and new raw (for the underlying Response object) and headers properties are included.
- The RequestError interface no longer contains a details field and now includes url and method fields.
- The signature of HTTP methods (post, put, patch, delete) now includes an optional bodyOptions parameter for explicit body serialization control.
- Import paths may need to be updated from the old package name to @asaidimu/network-client, and potentially for direct imports of submodules like BaseSDK if not re-exported from the main entry point.

# 1.0.0 (2024-10-29)


### Bug Fixes

* change package scope ([c31cecc](https://github.com/asaidimu/network-client/commit/c31ceccb81ef7a114fac8d2c994aa0ee4a9249d9))
* fix ci issues ([2804d74](https://github.com/asaidimu/network-client/commit/2804d7496423f3f53fd0978f63e13394cf739f54))


### Features

* initial commit ([ee40372](https://github.com/asaidimu/network-client/commit/ee40372cb65d59b76ac1283eed0158b110290146))
