/* eslint-disable */
var webpack = require('webpack')

module.exports = {
  entry: './lib/__entrypoint__.js',
  target: 'node',
  context: __dirname + '/packages/navy-cli',
  node: {
    __dirname: false,
    __filename: false,
  },
  output: {
    path: __dirname + '/packages/navy-cli/bin/',
    filename: 'navy.js',
  },
  module: {
    loaders: [
      { test: /\.json$/, loader: 'json' }
    ]
  },
  externals: {
    'fs': 'commonjs fs',
    'path': 'commonjs path',
  },
  plugins: [
    new webpack.BannerPlugin([
      '#!/usr/bin/env node'
    ].join('\n'), { raw: true, entryOnly: true }),
  ]
}

if (process.env.NODE_ENV === 'production') {
  module.exports.plugins = module.exports.plugins.concat([
    new webpack.optimize.UglifyJsPlugin(),
    new webpack.optimize.DedupePlugin(),
    new webpack.optimize.OccurenceOrderPlugin(true)
  ])
}
