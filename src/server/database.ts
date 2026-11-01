import "server-only";

import { type Client, createClient } from "@libsql/client";

const localState = globalThis as typeof globalThis & {
  notepadBffLocalDatabases?: Map<string, Client>;
};

export function createDatabaseClient(url: string, authToken?: string): Client {
  if (!url.startsWith("file:")) return createClient({ url, authToken });
  // SQLite has one writer. Share one queued connection across route bundles
  // and hot reloads, instead of racing separate personal/shared write pools.
  const clients = (localState.notepadBffLocalDatabases ??= new Map<
    string,
    Client
  >());
  let client = clients.get(url);
  if (!client || client.closed) {
    client = createClient({ url, concurrency: 1 });
    clients.set(url, client);
  }
  return client;
}
