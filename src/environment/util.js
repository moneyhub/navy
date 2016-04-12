/* @flow */

export function normaliseEnvironmentName(envName: string): string {
  return envName.replace(/\W/g, '')
}
