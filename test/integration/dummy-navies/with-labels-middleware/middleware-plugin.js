import {mapValues} from 'lodash'

export default navy => {

  navy.registerMiddleware(config => ({
    ...config,
    services: mapValues(config.services, (service, serviceName) => ({
      ...service,
      labels: {
        'com.navy.testlabel': 'Yay!',
      },
    })),
  }))

}
