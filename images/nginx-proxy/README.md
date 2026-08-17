This is the source code for the nginx proxy image which is used by Navy to provide a single HTTP entrypoint to all of your services.

The image is based off jwilder/nginx-proxy.

## 502 holding page

When an upstream returns 502/503, the proxy serves a holding page that polls for readiness and shows container state (starting vs exited) without guessing.

### Opt-in status endpoint

`GET /__navy_internal_proxy/status` is **off by default**. It is only registered in nginx, and `status-helper.pl` only runs, when `NAVY_STATUS_ENDPOINT` is `1`/`true`/`yes`.

This image is also the base for Navy Manager's cloud proxy (`FROM navycloud/navy-proxy`), where vhosts are internet-reachable. Leaving the endpoint off by default means cloud rebuilds do not expose Docker metadata unless they explicitly set the env var.

The navy CLI sets `NAVY_STATUS_ENDPOINT=1` (and `NAVY_STATUS_LOGS=1`) for locally-run proxies. Override via `httpProxyEnv` in a navy file or the `NAVY_HTTP_PROXY_ENV` allowlist.

### Behaviour when enabled

`status-helper.pl` reads the already-mounted Docker socket (same mount `docker-gen` uses), finds the compose service named by the first DNS label of `Host` / `X-Forwarded-Host`, and returns JSON: container state, exit code, and a TCP-only `ready` flag (no HTTP request to the visitor URL — replaying that with cookies broke OIDC `state`).

Recent log bodies are included only when `NAVY_STATUS_LOGS` is also set. Logs can contain tokens and client secrets.

The helper binds to `127.0.0.1` inside the proxy container; nginx proxies to it.
