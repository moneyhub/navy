import {isEmpty} from 'ramda'

export const basicAuthentication = (credentials) => {
  if (isEmpty(credentials)) {
    return null
  }

  const parameters = Buffer.from(`${credentials.username}:${credentials.password}`)
    .toString('base64')

  return `Basic ${parameters}`
}
