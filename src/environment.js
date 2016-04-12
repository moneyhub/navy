/* @flow */

const DEFAULT_ENVIRONMENT_NAME: string = 'dev'

class Environment {

  envName: string;

  constructor(envName) {
    this.envName = envName
  }

  launch(services) {
    console.log('Launching', services)
  }

  destroy() {
    console.log('Destroying environment')
  }

}

export function getEnvironment(envName: string = DEFAULT_ENVIRONMENT_NAME): Environment {
  return new Environment(envName)
}
