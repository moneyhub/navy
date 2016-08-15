---
title: Navyfile.js reference
---

`Navyfile.js` configuration reference
=====================================

A `Navyfile.js` file can be provided alongside your Compose config to configure additional functionality in Navy.

`Navyfile.js`:

```js
module.exports = {
  plugins: [
    'navy-plugin-nodejs'
  ],
  launchDefaults: [
    'myservice',
    'myotherservice'
  ],
  httpProxy: {
    myotherservice: { port: 8080 }
  },
  ignoreUnauthorizedRequestsForRegistries: [
    'localregistry.local:5000'
  ]
}
```


## Reference

### `plugins: ?Array<string>`

Specifies a list of plugins to load at runtime. This should be an array of strings of NPM packages. Packages specified in this array need to be installed via a `package.json` in the same directory as `Navyfile.js`.

### `launchDefaults: ?Array<string>`

A list of service names in the compose configuration which should be selected by default when doing a `navy launch` with a Navy which hasn't been launched yet.

### `httpProxy: ?{[key: string]: { port: Number }}`

If using the [built in HTTP proxy](http-proxy.md), you can tell Navy what port a service listens for HTTP connections here. If a service publishes port 80, it will automatically be registered with the HTTP proxy, so configuration here is unnecessary.

### `ignoreUnauthorizedRequestsForRegistries: ?Array<string>`

A list of URLs for registries which are considered insecure (have an invalid certificate, e.g self signed). Note that this does not tell Navy to communicate with a registry over HTTP, Navy can only communicate with Docker registries over HTTPS at the moment.
