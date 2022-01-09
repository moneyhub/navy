navy-plugin-nodejs
==================

A set of helpers to help improve the experience of developing NodeJS applications with Navy

## Installation

Create or update a `Navyfile.js` alongside your `docker-compose.yml`. Make sure you've added this plugin:

```json
module.exports = {
  plugins: ["navy-plugin-nodejs"]
}
```

Make sure you also `npm install navy-plugin-nodejs` alongside your Docker Compose config.

## Features

### Resolve `npm link`'d modules

When using `navy develop` with a Node app which has linked node modules, you might run into problems with the symlinks pointing to outside of the Docker container.

This will rewrite your `npm link`'d modules to point directly to the repo which is linked, and will also mount your home directory into the container so that symlink can be resolved.

## License

Licensed under the MIT License.

[View the full license here](https://raw.githubusercontent.com/moneyhub/navy/master/LICENSE).
