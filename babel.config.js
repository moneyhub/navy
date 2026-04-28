module.exports =
{
  'presets': [
    '@babel/preset-typescript',
    [
      '@babel/preset-env', {
        'targets': {
          'node': '22',
        },
      },
    ],
  ],
  'plugins': [
    '@babel/plugin-proposal-function-bind',
    'add-module-exports',
    '@babel/transform-flow-strip-types',
    '@babel/transform-runtime',
    './resources/babel/transform-error-codes.js',
  ],
  'parserOpts': {
    'allowReturnOutsideFunction': true,
  },
}
