Using the CLI
=============

## Launching a Navy

In order to launch a navy, you need to supply configuration which defines your environment.
This is done in the form of a `docker-compose.yml` file.

An example `docker-compose.yml` file might look like this:

```yaml
version: '2'

services:
  mongo:
    image: mongo
    ports:
      - 27017

  helloworld:
    image: dockercloud/hello-world
    ports:
      - 80
```

Make sure you've `cd`'d to the directory where your `docker-compose.yml` file is.

Then launch your navy!

```sh
$ navy launch
```

You will get a prompt asking you which services you'd like to bring up. Alternatively
you can preselect which services to bring up on the command line.

```sh
$ navy launch helloworld # Launches helloworld service only
```

Once you've launched your navy, you don't have to be in the directory where your
`docker-compose.yml` file is, it remembers the directory where you launched from!

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
