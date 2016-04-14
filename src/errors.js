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

export class EnvironmentNotInitialisedError extends NavyError {
  constructor(environmentName: string) {
    super('Environment "' + environmentName + '" not initialised')
  }

  prettyPrint() {
    super.prettyPrint()

    console.log(' Make sure you\'ve launched the environment with ' + chalk.bold('navy launch'))
    console.log()
  }
}
