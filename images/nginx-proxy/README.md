This is the source code for the nginx proxy image which is used by Navy to provide a single HTTP entrypoint to all of your services.

The image is based off jwilder/nginx-proxy.

The 502 holding page polls `GET /__navy_internal_proxy/status`, which is answered by `status-helper.pl` over the mounted Docker socket (already mounted for `docker-gen`). It returns the compose service's container state, matched by `com.docker.compose.service`, so the page can distinguish starting from exited without guessing. The helper binds to `127.0.0.1` inside the proxy container; nginx proxies to it.

Readiness (`ready`) is a bare TCP connect from the proxy to the container's port. The page must never test readiness by re-requesting the visitor's own URL: that replays their request with their cookies, and on an OIDC `/login` URL it rewrites the state cookie and breaks the pending `/callback`.

Recent container logs are only included when `NAVY_STATUS_LOGS` is set to `1`/`true`/`yes`. Logs can contain tokens and client secrets, and this image is the base for Navy Manager's cloud proxy where vhosts are internet-reachable, so the default is off. The navy CLI sets it for locally-run proxies; override it via `httpProxyEnv` in your navy file or the `NAVY_HTTP_PROXY_ENV` allowlist.
