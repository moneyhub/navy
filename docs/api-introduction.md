---
title: NodeJS API Introduction
---

Introduction to using the NodeJS API
====================================

*This documentation is a work in progress and might be incomplete*

One of the great things about Navy is that it allows you to launch and manipulate your environments, or "navies",
from the NodeJS api. Some example use cases of this might be:

- Bringing up all of your services to run integration tests against, maybe in a mocha "before" hook
- Accessing information like the IP and ports of services to connect to in a test run
- Ability to asynchronously wait for a service to become available

## Launching a Navy

First of all, you need to obtain an instance of a "navy".
Navies can have any name, and the name is used to identify the navy for when you have multiple ones running in parallel.

In this example, we're going to be using a navy named "dev".

```js
import {getNavy} from 'navy'

const navy = getNavy('dev')
```

Before we can launch any services, we need to initialise the navy. This is where important information gets passed in
such as the path to the directory containing your `docker-compose.yml` file.

```js
navy.initialise({
  configProvider: 'filesystem',
  path: '/some/path/to/directory/containing/docker-compose/file'
})
```

Here we are passing in `filesystem` as the config provider. A config provider is what provides the docker compose configuration
to Navy. At the moment we only support `filesystem`, but there are plans for more in the future.

Most API methods on the `navy` instance will return a Promise which resolves then the action has been completed.

Now you can launch some services:

```js
navy.launch(['some', 'services', 'here'])
```

You can optionally pass an array to `launch` like we have above, which specifies what services from `docker-compose.yml` should
be launched. If you don't pass an array, all services will be launched.


## Next steps

These docs are very much a work in progress. If you want to see what else you can do with your `navy` instance, check out the
integration tests or the `packages/navy/src/navy/index.js` file.
