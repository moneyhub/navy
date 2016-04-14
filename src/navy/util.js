/* @flow */

export function normaliseNavyName(envName: string): string {
  return envName.replace(/\W/g, '')
}
