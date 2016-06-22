Using Navy's Development Mode
=============================

*This documentation is a work in progress and might be incomplete*

Navy allows you to put services into development mode which will mount your source code into the container at runtime. This allows for rapid development and quick switching on and off of testing your local changes.


## The `.navyrc` file

Before you can use the development mode on a service, you need to go to the corresponding repo/directory for where your source code is for that service and create a `.navyrc` file. This basically tells Navy the names of the services in your environment that the repo corresponds to and how the source code should be mounted in.

`~/dev/my-awesome-webapp/.navyrc`:

```json
{
  "services": ["my-awesome-webapp"],
  "develop": {
    "mounts": {
      "./": "/usr/src/app"
    },
    "command": "npm run start-watch"
  }
}
```

Here we are mounting the root of the repo into `/usr/src/app` which is where our Docker container looks for the source code of the app to run.

We're also overriding the run command of the container to be `npm run start-watch`. `start-watch` could be an npm script in your `package.json` which runs your application with something like Nodemon which will watch your source code and restart the app when changes are detected.


## Putting the service into development mode

Now that you have your `.navyrc` file, you can run `navy develop` from the same directory and it will put `my-awesome-webapp` into development mode and mount the source code and override the command.

Here's what this might look like:

```sh
$ navy develop

🚧 my-awesome-webapp has now restarted in development 🚧
--------------------------------------------------------


> my-awesome-webapp@1.0.0 start-watch /usr/src/app
> nodemon build/server.js

[nodemon] 1.9.2
[nodemon] to restart at any time, enter `rs`
[nodemon] watching: *.*
[nodemon] starting `node src/index.js`

My awesome webapp server starting...
Now listening on port 80!
```

As you can see, `navy develop` has restarted the service and automatically streamed the logs to the terminal.

`navy develop` actually attaches itself to stdin and stdout directly which enables you to write commands to your application, just like you would be able to if you were running it directly on your machine with Node. So with Nodemon, I can type `rs` to manually restart the server:

```sh
My awesome webapp server starting...
Now listening on port 80!

rs
[nodemon] starting `node src/index.js`

My awesome webapp server starting...
Now listening on port 80!
```

It's worth noting that if you `Ctrl+C` out of `navy develop`, the service will continue running in development mode, you have just detached from the process. To reattach or restart the service, just run `navy develop` again.

When your service is in development mode, it will show in `navy status` or `navy ps`:

```sh

  dev (default navy)

  ID        Name             Image                                Status
  c51666e…  my-awesome-web…  myorganisation/myawesomewebapp       running (development)
  b53959a…  redis            redis:2.8                            running

```


## Taking the service out of development mode

You can quickly switch back to the live code that's baked into your Docker image with one command:

```sh
$ navy live
```

Make sure you run it from the same directory where you ran `navy develop`.
