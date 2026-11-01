import "server-only";

import { type Client, createClient } from "@libsql/client";

const localState = globalThis as typeof globalThis & {
  notepadBffLocalDatabases?: Map<string, Client>;
  notepadBffLocalQueue?: Promise<unknown>;
};

export function createDatabaseClient(url: string, authToken?: string): Client {
  if (!url.startsWith("file:")) return createClient({ url, authToken });
  // Share local clients across route bundles and hot reloads.
  // The request queue below serializes complete operations, including schema reads.
  const clients = (localState.notepadBffLocalDatabases ??= new Map<
    string,
    Client
  >());
  let client = clients.get(url);
  if (!client || client.closed) {
    client = createClient({ url });
    clients.set(url, client);
  }
  return client;
}

export function withLocalDatabaseQueue<T>(
  operation: () => Promise<T>,
): Promise<T> {
  const url =
    process.env.TURSO_DATABASE_URL ??
    (process.env.NODE_ENV === "development" ? "file:web-notepad-local.db" : "");
  if (!url.startsWith("file:")) return operation();
  // libSQL rejects operations while a single connection holds a transaction;
  // limiting its pool is not a mutex. Queue the whole request, not individual
  // statements, so another request cannot interleave with a transaction.
  const pending = (localState.notepadBffLocalQueue ?? Promise.resolve()).then(
    operation,
  );
  localState.notepadBffLocalQueue = pending.then(
    () => undefined,
    () => undefined,
  );
  return pending;
}
