import { MongoClient, type Db } from "mongodb"

import { env } from "@/server/env"

const globalForMongo = globalThis as typeof globalThis & {
  mongodbClientPromise?: Promise<MongoClient>
}

function createClientPromise(): Promise<MongoClient> {
  const client = new MongoClient(env.mongoUri)
  return client.connect()
}

export function getMongoClientPromise(): Promise<MongoClient> {
  if (!globalForMongo.mongodbClientPromise) {
    globalForMongo.mongodbClientPromise = createClientPromise()
  }
  return globalForMongo.mongodbClientPromise
}

export async function getMongoClient(): Promise<MongoClient> {
  return getMongoClientPromise()
}

export async function getDb(dbName?: string): Promise<Db> {
  const client = await getMongoClient()
  return dbName ? client.db(dbName) : client.db()
}
