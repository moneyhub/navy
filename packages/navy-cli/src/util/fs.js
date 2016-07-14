import bluebird from 'bluebird'

export default bluebird.promisifyAll(require('fs'))
