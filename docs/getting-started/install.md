---
title: Installing Navy
section: install
---

Installing Navy
===============

Before you start
----------------

Before we get started, if you haven't yet got Docker and Docker Compose installed, head over to <https://www.docker.com/products/docker>.

Make sure you've got at least Docker 1.10.0 installed and Docker Compose 1.7.0:

```sh
$ docker -v
Docker version 1.12.1, build 23cf638, experimental
$ docker-compose -v
docker-compose version 1.8.0, build f3628c7
```

You'll also need NodeJS and NPM. You can get these at <https://nodejs.org>.


Installing Navy
---------------

You can install the latest version of Navy easily using NPM:

```sh
$ npm install -g navy
```

Once installed, make sure it's working with:

```sh
$ navy --version
2.5.0
```

<span class="move-on-link">Now, move on to [Hello World](./hello-world.md).</span>
