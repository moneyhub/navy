import developMiddleware from '../middleware/develop'
import tagOverrideMiddleware from '../middleware/tag-override'
import portOverrideMiddleware from '../middleware/port-override'
import addServiceProxyMiddlerware from '../middleware/add-service-proxy-config'
import setEnvironmentVariables from '../middleware/set-env-vars'
import setLoggingDriver from '../middleware/set-logging-driver'
import setImage from '../middleware/set-image'

import type {Navy} from './'

export default (navy: Navy) => ([
  developMiddleware,
  tagOverrideMiddleware,
  portOverrideMiddleware,
  setEnvironmentVariables,
  setLoggingDriver,
  setImage,
  addServiceProxyMiddlerware(navy),
])
