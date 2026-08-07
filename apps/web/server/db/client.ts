import { MongoClient, type Db } from "mongodb"

import { env } from "@/server/env"

const globalForMongo = globalThis as typeof globalThis & {
  mongodbClient?: MongoClient
  mongodbClientPromise?: Promise<MongoClient>
}

function getClient(): MongoClient {
  if (!globalForMongo.mongodbClient) {
    globalForMongo.mongodbClient = new MongoClient(env.mongoUri)
    globalForMongo.mongodbClientPromise =
      globalForMongo.mongodbClient.connect()
  }
  return globalForMongo.mongodbClient
}

export function getMongoClientSync(): MongoClient {
  return getClient()
}

export function getMongoClientPromise(): Promise<MongoClient> {
  getClient()
  return globalForMongo.mongodbClientPromise!
}

export async function getMongoClient(): Promise<MongoClient> {
  const client = getClient()
  await getMongoClientPromise()
  return client
}

export function getDbSync(dbName?: string): Db {
  const client = getClient()
  return dbName ? client.db(dbName) : client.db()
}

export async function getDb(dbName?: string): Promise<Db> {
  await getMongoClientPromise()
  const { ensureMongoIndexes } = await import("@/server/db/indexes")
  void ensureMongoIndexes()
  return getDbSync(dbName)
}
