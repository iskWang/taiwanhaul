declare module 'bun:sqlite' {
  export class Database {
    constructor(filename: string);
    exec(sql: string): void;
    query(sql: string): {
      run(...values: unknown[]): unknown;
      all(...values: unknown[]): Record<string, unknown>[];
      get(...values: unknown[]): Record<string, unknown> | null;
    };
    transaction<T>(fn: () => T): () => T;
    close(): void;
  }
}
