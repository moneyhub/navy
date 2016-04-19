/* @flow */

export const Status = {
  RUNNING: 'running',
  EXITED: 'exited',
}

export type Service = {
  id: string,
  name: string,
  image: string,
  status: string,
  raw: ?Object,
}

export type ServiceList = Array<Service>
