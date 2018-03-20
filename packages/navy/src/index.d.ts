declare module "navy" {
  export interface State {
    configProvider?: string
    path?: string
  }

  export interface Navy {
    destroy: () => Promise<void>
    initialise: (opts: State) => Promise<void>
    launch: (services: string[]) => Promise<void>
    port: (service: string, privatePort: number) => Promise<number | undefined>
  }

  export function getNavy(name: string): Navy
}
