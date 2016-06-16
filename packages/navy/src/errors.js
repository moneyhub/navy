/* @flow */

import chalk from 'chalk'

export class NavyError {
  message: string;

  constructor(message: string) {
    this.message = message
  }

  prettyPrint() {
    console.log()
    console.log(chalk.bgRed(chalk.bold(' ERROR ')))
    console.log()
    console.log(' ' + this.message)
    console.log()
  }
}

export class NavyNotInitialisedError extends NavyError {
  constructor(navyName: string) {
    super('Navy "' + navyName + '" not imported')
  }

  prettyPrint() {
    super.prettyPrint()

    console.log(' Make sure you\'ve imported the navy with ' + chalk.bold('navy import'))
    console.log()
  }
}
