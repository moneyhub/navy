/* eslint-disable */

var fs = require('fs')
var path = require('path')

var _errorCodes = null
var _lastReadErrorCodes = null

function getErrorCodes() {
  if (!_errorCodes || !_lastReadErrorCodes || (Date.now() - _lastReadErrorCodes) > 5000) {
    _errorCodes = JSON.parse(fs.readFileSync(path.join(__dirname, '../', 'error-codes.json')))
    _lastReadErrorCodes = Date.now()
  }

  return _errorCodes
}

module.exports = function (babel) {
  var t = babel.types
  var SEEN_SYMBOL = Symbol('transform-error-codes.seen')

  return {
    visitor: {
      CallExpression: {
        exit: function (path) {
          var errorCodes = getErrorCodes()
          var node = path.node

          if (node[SEEN_SYMBOL]) return

          if (path.get('callee').isIdentifier({ name: 'invariant' })) {
            node[SEEN_SYMBOL] = true

            var errCode = node.arguments[1].value

            if (!errorCodes[errCode]) {
              throw path.buildCodeFrameError(
                'Error code ' + errCode + ' not found in error-codes.json'
              )
            }

            var extraArgs = node.arguments.length - 2
            var expectedArgs = errorCodes[errCode].split('%s').length - 1

            if (extraArgs !== expectedArgs) {
              throw path.buildCodeFrameError(
                'Not enough arguments provided for error code ' + errCode + ', expected ' + expectedArgs
              )
            }

            var newExpression = t.callExpression(
              node.callee,
              [
                node.arguments[0],
                t.stringLiteral(errorCodes[errCode])
              ].concat(node.arguments.slice(2))
            )

            newExpression[SEEN_SYMBOL] = true

            path.replaceWith(newExpression)
          }
        },
      },
    },
  }
}
