declare var process: {
  env: {[key: string]: ?string},
  argv: Array<string>,
  platform: string,
  stdout: any,
  stderr: any,
  cwd(): string,
  on(event: string, listener: (...args: Array<any>) => mixed): any,
  exit(code?: number): void,
  ...
};

declare var __dirname: string;
declare var __filename: string;
