export {
  getDb,
  getDbSync,
  getMongoClient,
  getMongoClientPromise,
  getMongoClientSync,
} from "@/server/db/client"
export { collections, type CollectionName } from "@/server/db/collections"
export { ensureMongoIndexes } from "@/server/db/indexes"
