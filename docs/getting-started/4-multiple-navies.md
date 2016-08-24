---
title: Working with multiple Navies
---

Working with multiple Navies
==================================

You can launch multiple Navies in parallel and operate them.

Unlike with Docker Compose, when you launch a Navy (with `navy import` and `navy launch`), you can then operate on that Navy from any directory on your machine, no need to remain in the same directory as your configuration.

Navies all have a name (which ends up being the Docker Compose project name) which defaults to "dev" when not specified. So when you run Navy commands, the Navy which it will be operating on will be "dev".

You can change the Navy that the CLI will operate on by using various different methods:

### Command line

Just add `-e nameOfNavy` to each command to change which Navy the command will run for.


### Environment variables

You can set/export the `NAVY_NAME` environment variable.


### Config file

You can also just quickly change the name of the default Navy by using:

```sh
$ navy config set default-navy [newname]
```

All further commands which aren't overriding the name of the Navy by either CLI argument or Environment Variable will use the name provided here.

You can change it back to "dev" with:

```sh
$ navy config rm default-navy
```
