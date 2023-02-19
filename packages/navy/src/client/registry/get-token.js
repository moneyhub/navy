import fetch from 'node-fetch'
import * as R from 'ramda'

const getToken = async ({
  realm,
  service,
  scope,
}, {
  headers,
  agent,
}) => {
  const url = `${realm}?service=${service}&scope=${scope}`
  const options = {
    headers: R.pick(['Authorization'], headers),
    agent,
  }

  const response = await fetch(url, options)

  if (response.status === 401) {
    throw new Error('Invalid authentication')
  }

  const {token} = await response.json()
  return token
}

export default getToken
