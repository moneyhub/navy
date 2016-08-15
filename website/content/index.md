---
title: Quick and powerful development environments using Docker and Docker Compose
---

# Quick and powerful development environments using Docker and Docker Compose

Define your app's environment with a compose file (`docker-compose.yml`):

```yaml
version: '2'

services:
  web:
    image: mycompany/myapp
    ports:
      - "80"
    depends_on:
      - worker
      - redis

  worker:
    image: mycompany/myworker
    ports:
      - "80"
    depends_on:
      - redis

  redis:
    image: redis
```

Now run `navy launch` and Navy will launch all of your services.

You will get a prompt asking which services you'd like to launch, which is extremely useful if you have a microservice-like
architecture and have lots of services which aren't all required. If a service you select has dependencies defined in the
compose file, they will be launched regardless of whether you selected them.

Navy builds on top of Docker Compose, so if you already use Docker Compose then you can get started without any additional
configuration.

#### You might want to use Navy if:

- **You have a lot of services which talk to each-other or have similar dependencies**

  Navy centralises your compose file for your entire applications stack, so you can get a complete picture of what
  is needed to run any part of your app, all in one place.

- **Your workflow involves working on multiple/different services every day**

  Unlike Docker Compose, Navy's environment isn't static and doesn't require configuration changes to change how your
  services are running. If you want to work on a service locally, you can easily mount the source code from your machine
  into the service without breaking how other services talk to it. All this can be done with a simple command.

- **You want to spin up isolated environments for integration tests**

  Navy is also a NodeJS API, which allows you to quickly spin up an isolated environment with services of your choice
  for an integration test, all from within your test run. Navy handles waiting for services to become available before
  letting your tests commence.

- **You want the developer experience to be easier**

  Navy has a load of small things to help make your life easier:
    - Access HTTP services using `myservice.dev.0.xip.io` instead of using pesky IPs and ports.
      Great for testing on other devices as well.
    - Easily revert services to an old version. Makes it easier to find bugs that are only visible with a certain
      version of all your services.
    - Lock down ports for services which you debug often, like Mongo or Redis. It can be annoying entering a random
      port into Robomongo every time you want to view what's in your database.
