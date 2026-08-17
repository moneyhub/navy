This is the source code for the nginx proxy image which is used by Navy to provide a single HTTP entrypoint to all of your services.

The image is based off jwilder/nginx-proxy.

The 502 holding page polls `GET /__navy_internal_proxy/status`, which is answered by `status-helper.pl` over the mounted Docker socket. It returns the compose service's container state and recent logs (matched by `com.docker.compose.service`) so the page can show starting vs exited without guessing. Local-only — the helper binds to `127.0.0.1` inside the proxy container.
