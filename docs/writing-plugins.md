Writing plugins for Navy
========================

*This documentation is a work in progress and might be incomplete*

Navy allows you to customise the CLI and manipulate services at runtime by using plugins.

Some potential ideas for plugins:

- Install custom Docker Registry certificate to the users machine before `navy launch` runs.
- Replace Docker image in `docker-compose.yml` with a copy on a local cache at runtime.
- Allow changing of your config for your services by using environment variables when users run `navy launch`.
