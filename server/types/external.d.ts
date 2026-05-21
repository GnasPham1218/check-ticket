declare module 'cors';
declare module 'better-sqlite3';
declare module 'node:fs';
declare module 'node:fs/promises';
declare module 'node:path';
declare module 'node:url';
declare module 'express' {
  const express: any;
  export default express;
  export type Request = any;
  export type Response = any;
}

declare namespace NodeJS {
  interface ProcessEnv {
    [key: string]: string | undefined;
  }
}

declare const process: {
  env: NodeJS.ProcessEnv;
};
