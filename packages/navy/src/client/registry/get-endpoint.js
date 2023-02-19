import * as R from 'ramda'
import https from 'https'
import fetch from 'node-fetch'
import getToken from './get-token'
import {restSpecification} from '../../domain/oci-api-specification'
import getAuthenticationForRegistry from './get-credentials'
import {basicAuthentication} from './helpers'
import parsers from 'www-authenticate/lib/parsers'

const handleUnauthorizedResponse = async ({
  response,
  context,
  url,
}) => {
  const challenges = response.headers.get('WWW-Authenticate')
  const {scheme, parms} = new parsers.WWW_Authenticate(challenges)

  if (scheme === 'Basic') {
    throw new Error('Invalid authentication')
  }

  if (scheme !== 'Bearer') {
    throw new Error('Invalid authentication')
  }

  try {
    const token = await getToken(parms, context)

    const options = R.mergeDeepRight(context, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
    })

    const response = await fetch(url, options)

    if (response.status === 401) {
      throw new Error('Access denied')
    }

    return response
  } catch (exception) {
    throw exception
  }
}

const get = async ({
  allowUnauthorizedRequest = false,
  endpoint,
  registry,
  options = {},
}) => {
  const url = restSpecification.operation(registry, endpoint)
  const credentials = await getAuthenticationForRegistry(registry)

  const context = R.mergeDeepLeft(options, {
    headers: R.reject(R.isNil, {
      'Authorization': basicAuthentication(credentials),
    }),

    agent: new https.Agent({
      rejectUnauthorized: !allowUnauthorizedRequest,
    })
  })

  try {
    const response = await fetch(url, context)

    switch (response.status) {
      case 401:
        return handleUnauthorizedResponse({
          response,
          context,
          url,
        })

      case 404:
        throw new Error('Operation not found', {
          status: 404,
          body: await response.json()
        })

      default:
        return response
    }
  } catch (exception) {
    throw exception
  }
}

export default get
