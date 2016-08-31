---
title: Writing plugins
section: docs
---

Writing plugins for Navy
========================

Navy allows you to customise the CLI and manipulate services at runtime by using plugins.

Some examples of why you might want to use plugins:

- **Install custom Docker Registry certificate to the users machine before `navy launch` runs.**
  This improves the developer experience within your team if you require a custom certificate.

- **Replace Docker image in `docker-compose.yml` with a copy on a local cache at runtime.**
  You might want to mirror your Docker images locally to reduce the load on your network. By writing a plugin,
  you can change which images are being pulled at runtime.

- ...

## Using plugins

Plugins are defined in your projects `Navyfile.js` which lives in your project root.
[See Navyfile.js configuration reference](navyfile-config.md).

## Writing plugins

Plugins are just standard node modules which export a function which gets passed a `Navy`.
Create a new folder with a `package.json` and `index.js`.

`index.js`:
```js
module.exports = function (navy) {
  // plugin code here
}
```

Your plugin can now register middleware, provide custom commands for the CLI, or hook into various lifecycle events.

## Custom commands

A plugin can provide custom commands which the user can run using `navy run [command]`. This can be useful for workflow related operations which might be specific to your team. This is not meant to be used for commands related to the build of your app, this is more for utilities.

You can register a custom command in your `index.js`:

```js
function migrateData(navy) {
  console.log('Called migrate data command with navy %s', navy.name)
}

module.exports = function (navy) {
  navy.registerCommand('migrate-data', migrateData.bind(null, navy))
}
```

Now to test it, make sure you have a Navy set up called `dev` with a `Navyfile.js` in the project root with the plugin added to the plugins array.

Then run:

```sh
$ navy run migrate-data
Called migrate data command with navy dev
```

Success!

## Middleware

Middleware is responsible for manipulating the compose config at runtime. You register middleware by passing in a function which will get called with the current compose config, as well as the state of the current Navy, and the function should return new compose configuration. You can think of it as a set of reducers:

```js
// Pseudocode for how middleware gets run
const middleware = [/* registered middleware from plugins */]
const currentComposeConfig = /* your docker compose config */

const newComposeConfig = middleware.reduce(
  (composeConfig, middleware) => middleware(composeConfig),
  currentComposeConfig,
)
```

A middleware function looks like this:

`index.js`:
```js
const {middlewareHelpers} = require('navy')

function newImageForService(service) {
  // Replace myorg/myimage with somelocalregistry.local/myorg/myimage
  if (service.image && service.image.indexOf('myorg/') !== -1) {
    return service.image.replace('myorg/', 'somelocalregistry.local/myorg/')
  }

  return service.image
}

function replaceImage(config) {
  return middlewareHelpers.rewriteServices(config, service => ({
    ...service,
    image: newImageForService(service),
  }))
}

module.exports = function (navy) {
  navy.registerMiddleware(replaceImage)
}
```

The `replaceImage` function takes in the current compose config, and returns a new config object. The `middlewareHelpers.rewriteServices` is a helper function provided by Navy which will return a new config object with new config for each service based on the return value of the map callback provided.

So `replaceImage` will return something like:

```js
{
  version: 2,
  services: {
    myapp: {
      image: 'somelocalregistry.local/myorg/myimage',
      ports: ['80'],
    },
  },
}
```

Middleware functions should not mutate the config passed in and should instead return a new instance of the config.

The code snippet above will cause any service with the image `myorg/[somename]` to pull down `somelocalregistry.local/myorg/[somename]` instead.

## Lifecycle hooks

You can easily hook into various lifecycle hooks in Navy to add functionality.

For example, in `index.js`:

```js
function handleBeforeLaunch() {
  console.log('Before launch!')
}

module.exports = function (navy) {
  navy.on('cli.before.launch', handleBeforeLaunch)
}
```

Plugin hooks can be asynchronous and return a promise.
