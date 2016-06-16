navy [![Build Status](https://img.shields.io/travis/momentumft/navy/master.svg?style=flat)](https://travis-ci.org/momentumft/navy) [![Downloads](https://img.shields.io/npm/dm/navy.svg)](https://npmjs.com/package/navy) [![NPM](https://img.shields.io/npm/v/navy.svg)](https://npmjs.com/package/navy) [![Github Issues](https://img.shields.io/github/license/momentumft/navy.svg)](https://github.com/momentumft/navy)
==================

> Docker Compose wrapper to allow for easy development workflows

Navy is a command line tool and Node library to help make working on your application easier when it has many services,
perfect if you have a microservice-like architecture.

It adds additional functionality on top of Docker Compose which means it's super easy to get started if you're already familiar with the Docker ecosystem.

We're very much early days with Navy, and lots of the functionality we are using in our team internally hasn't been open sourced here yet!

## Features

- **Work on services in your environment**

  Easily mount your source code into a service container so you can work on it locally, whilst keeping it in the Docker network.
  Done from one single command!

- **Easily run multiple instances of your environment in parallel.**

  This is useful if you want to have a development environment where you do all of your usual, manual testing,
  but also want to be able to spin up another environment with all of your services for an automated integration test run.

- **Swap out versions of services**

  Great for when you want to quickly revert to an old version of a service.

- **Javascript API for interfacing with Docker and Docker Compose**

  Easily launch and manage environments from your code. Useful for if you want to spin up an environment at the start of a test run.

- **Plugin system**

  Add your own commands or manipulate the Docker Compose configuration however you like at runtime using config reducers.
  An example of how we use this internally is rewriting the images to point to a local registry cache instead of pulling from Docker Hub.


## Installation

Navy can be installed globally as a CLI tool, or locally in your application so you can use the API to manage environments from code.

### CLI installation

```sh
$ npm install -g navy
$ navy help
```

### Package installation

```sh
$ npm install --save-dev navy
```

## Getting started

- [Guide to using the CLI](docs/using-the-cli.md)
- [Introduction to the NodeJS API](docs/api-intro.md)


## License

Licensed under the MIT License.

[View the full license here](https://raw.githubusercontent.com/momentumft/navy/master/LICENSE).
