---
title: HTTP Proxy
---

HTTP Proxy
==========

Navy includes a built in Nginx reverse proxy which allows you to access all of your HTTP services on port 80 using `[servicename].[navyname].0.0.0.0.nip.io`.

This takes advantage of the [nip.io](http://nip.io) service, which provides a URL which resolves to whatever IP address you put in the subdomain, for example:

```
[servicename].[navyname].0.0.0.0.nip.io               resolves to 0.0.0.0
[servicename].[navyname].192.168.1.10.nip.io    resolves to 192.168.1.10
```

This allows Navy to easily proxy all of your HTTP services by using virtual hosts in nginx, and also allows for you to quickly reconfigure Navy so it is using your external LAN IP for nip.io domains so you can easily test your services on other devices on your LAN.

Navy will automatically pick up and proxy any services which publish port 80, but if your service uses another port then you will need to [explicitly configure it in `Navyfile.js`](navyfile-config.md).

## Customising the proxy image

By default, Navy uses the `navycloud/navy-proxy` Docker image for the HTTP proxy. You can override this to use a custom image.

The image is resolved in the following order of precedence:

1. **`NAVY_HTTP_PROXY_IMAGE` environment variable** - highest precedence. Set this in your shell environment to override the proxy image globally.
2. **`httpProxyImage` property in `Navyfile.js`** - per-project override. See the [Navyfile.js reference](navyfile-config.md) for details.
3. **Default (`navycloud/navy-proxy`)** - used when neither of the above is set, preserving backwards-compatible behaviour.

### Examples

Override via environment variable:

```bash
export NAVY_HTTP_PROXY_IMAGE=myregistry/custom-proxy:latest
navy launch
```

Override via `Navyfile.js`:

```js
module.exports = {
  httpProxyImage: 'myregistry/custom-proxy:latest',
}
```

## Passing environment variables to the proxy

Custom proxy images often need runtime configuration. Navy provides two complementary surfaces for forwarding environment variables to the `nginx-proxy` container, with a clear precedence rule so static project defaults can be overridden from the operator's shell at run time.

The forwarded environment is built from:

1. **`NAVY_HTTP_PROXY_ENV` environment variable** - highest precedence. A comma-separated allowlist of names. For each name listed, Navy reads the matching value from its own process environment and forwards it to the proxy container. Names with no value (or an empty value) in the navy process env are silently skipped.
2. **`httpProxyEnv` property in `Navyfile.js`** - per-project map of `NAME -> value` pairs. Values are coerced to strings; entries with `null`, `undefined`, or empty-string values are dropped. See the [Navyfile.js reference](navyfile-config.md) for the property definition.

When both are configured, the two sources are merged. On key collisions the `NAVY_HTTP_PROXY_ENV` allowlist wins, so an operator can always override a project default from their shell. When neither is configured, no `environment:` block is written to the generated compose config and the proxy container starts with no extra environment variables.

### Examples

Forward shell variables via the allowlist:

```bash
export MY_PROXY_TOKEN=secret
export NAVY_HTTP_PROXY_ENV=MY_PROXY_TOKEN
navy launch
```

Set per-project defaults in `Navyfile.js`:

```js
module.exports = {
  httpProxyImage: 'myregistry/custom-proxy:latest',
  httpProxyEnv: {
    FEATURE_FLAG: 'on',
    UPSTREAM_TIMEOUT: '30',
  },
}
```
