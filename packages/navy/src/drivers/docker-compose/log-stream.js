/* @flow */

import {Transform} from 'stream'

export default class LogStream extends Transform {

  _transform(data: any, encoding: string, callback: Function) {
    callback(null, data)
  }

}
