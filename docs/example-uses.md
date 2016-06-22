Example day to day uses of Navy
====================

*This documentation is a work in progress and might be incomplete*

## Viewing the status of all my services and environments

You can view all of your services across environments by running:

```sh
$ navy status
```

Alternatively, `navy ps` will show the services just from the current working environment.


## Temporarily using a different version/tag of a service locally

Navy allows you to swap out the tag being used for the Docker image temporarily.
This can be done with:

```sh
$ navy use-tag my-awesome-webapp custom-tag
```

It will now be using `custom-tag`, and will show on `navy status` and `navy ps`.

To reset back to the default tag defined in the Docker Compose config, run:

```sh
$ navy reset-tag my-awesome-webapp
```

## Streaming logs for a service

Navy works very similar to Docker Compose when it comes to streaming logs:

```sh
$ navy logs my-awesome-webapp
```

## Run multiple instances of your environment in parallel

[See working with multiple environments](multiple-environments.md).

## Working on a service locally

[See working with Navy's development mode](development-mode.md).
