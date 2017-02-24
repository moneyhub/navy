Navy [![Build Status](https://img.shields.io/travis/momentumft/navy/master.svg?style=flat)](https://travis-ci.org/momentumft/navy) [![Downloads](https://img.shields.io/npm/dm/navy.svg)](https://npmjs.com/package/navy) [![NPM](https://img.shields.io/npm/v/navy.svg)](https://npmjs.com/package/navy) [![Github Issues](https://img.shields.io/github/license/momentumft/navy.svg)](https://github.com/momentumft/navy)
==================

> A tool for easy multi-service development powered by Docker Compose

Navy is a command line tool and NodeJS library to help make working on your application easier when it has many services or backing services.

It builds on top of Docker Compose which means it's super easy to get started if you're already familiar with the Docker ecosystem. Simply point Navy at your existing `docker-compose.yml` and then you're good to go. With a single command, you can launch all of your services from your configuration and go on to manage those services and debug them.

An example `docker-compose.yml` might look like this:

```yaml
version: '2'

services:
  web:
    image: mycompany/myapp
    ports:
      - "80:80"
    depends_on:
      - redis

  redis:
    image: redis
```

Navy is great for development as it allows you to put a service into "development mode" from the command line, which automatically mounts your local source code into the container. This is great for quickly working on multiple services without having to change any configuration.

Navy is also great for testing and CI as you can bring up your environment before your test run and even get information like host and ports of various services using the NodeJS API.

You can customise the functionality of Navy by writing Javascript plugins which can add workflow commands or control your service configuration at runtime using middleware. [See more about writing plugins](docs/writing-plugins.md).


## Features

- **Work on services in your environment**

  Easily mount your source code into a service container so you can work on it locally, whilst keeping it in the Docker network.
  Done from one single command!

- **Easily run multiple instances of your environment in parallel.**

  This is useful if you want to have a development environment where you do all of your usual, manual testing,
  but also want to be able to spin up another environment with all of your services for an automated integration test run.

- **Swap out versions of services**

  Great for when you want to quickly revert to an old version of a service.

- **Built in HTTP proxy**

  Access your services using `myservice.dev.nip.io` rather than using pesky IP addresses and random ports.
  This is also great for testing your services on other devices like tablets and phones.

- **Javascript API for interfacing with Docker and Docker Compose**

  Easily launch and manage environments from your code. Useful for if you want to spin up an environment at the start of a test run or extract the host and port of a running service.

- **Plugin system**

  Add your own commands or manipulate the Docker Compose configuration however you like at runtime using config reducers.
  An example of how we use this internally is rewriting the images to point to a local registry cache instead of pulling from Docker Hub.


## Getting started

```sh
$ npm install -g navy
$ cd my-docker-compose-config # where your docker-compose.yml might live
$ navy launch # launch your services!
```

[Now check out the documentation on the Navy website](https://momentumft.github.io/navy/)

## License

Licensed under the MIT License.

[View the full license here](https://raw.githubusercontent.com/momentumft/navy/master/LICENSE).
