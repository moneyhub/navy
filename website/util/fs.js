import bluebird from 'bluebird'

export const glob = bluebird.promisify(require('glob'))
export const mkdirp = bluebird.promisify(require('mkdirp'))
export const fs = bluebird.promisifyAll(require('fs'))
