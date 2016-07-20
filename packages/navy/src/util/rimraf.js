import bluebird from 'bluebird'

export default bluebird.promisify(require('rimraf'))
