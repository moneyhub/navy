Using the CLI
=============

## Importing a Navy

In order to get started, you need to import your docker compose configuration.
`cd` to the directory where you have your docker compose config, and then run:

```sh
$ navy import
```

Now you should be ready to operate on your Navy!

It's worth noting that once you've imported your config, you don't have to be in the directory where your
docker compose config is, it remembers the directory where you imported from!


## Launching services

Now you can run:

```sh
$ navy launch
```

You will get a prompt asking you which services you'd like to bring up. Alternatively
you can preselect which services to bring up on the command line.

```sh
$ navy launch helloworld # Launches helloworld service only
```

## Listing the running services

You can view the status of your navy by running:

```sh
$ navy ps
```

Or you can view the status of all of your navies by running:

```sh
$ navy status
```

## Launch another Navy in parallel

One of the benefits of Navy is the ability to work with multiple environments (or navies) in parallel.

Each navy has a name, and by default Navy uses `dev` as the name. You can specify the
navy name using the `-e` option.

So let's launch a new navy with a different name.

```sh
$ navy launch -e test
```

You'll receive the prompt for choosing the services you want to launch.

Now run `$ navy status` to see your two navies running in parallel.


## Destroying a Navy

When you are finished, you can destroy your navies by using:

```sh
$ navy destroy
$ navy destroy -e test
```
