import { MongoClient } from 'mongodb'
const mongoConnectionString = 'mongodb://localhost:27017/cs-builder'
const client = new MongoClient(mongoConnectionString)

// remove once mongo is ahead of database.js
import database from './database.js'

class Repo {
  connect() {
    this.db = client.db('cs-builder')
    return client.connect()
  }

  // import data from database.js
  // remove once mongo is ahead of database.js
  resetMongo() {
    const collectionNames = ['art', 'blocks', 'items', 'characters', 'levels', 'enemies']

    collectionNames.forEach(cn => {
      let items = database.projects.flatMap(p =>
        Object.values(p[cn]).map(e => ({
          ...e,
          projectId: p.id.toString(),
          id: e.id.toString(),
        }))
      )

      // strip some unused stuff on blocks
      if (cn == 'blocks') {
        items = items.map(b => ({
          id: b.id,
          projectId: b.projectId,
          name: b.name,
          graphic: b.graphic,
          canWalk: b.canWalk,
          canSee: b.canSee,
        }))
      }

      // delete everything that was there
      this.db
        .collection(cn)
        .deleteMany({})
        .then(() => {
          // insert new ones
          this.db.collection(cn).insertMany(items)
        })
    })
  }

  insert(collectionName, object) {
    return this.db.collection(collectionName).insertOne(object)
  }

  update(collectionName, keys, newValue) {
    if (newValue._id != null) delete newValue._id

    console.log('updateOne', collectionName, keys, newValue)
    return this.db.collection(collectionName).updateOne(keys, {
      $set: newValue,
    })
  }

  delete(collectionName, filter) {
    return this.db.collection(collectionName).deleteOne(filter)
  }

  deleteMany(collectionName, filter) {
    return this.db.collection(collectionName).deleteMany(filter)
  }

  get(collectionName, filters) {
    return this.db.collection(collectionName).findOne(filters)
  }

  find(collectionName, filters = {}) {
    return this.db.collection(collectionName).find(filters).toArray()
  }
}

export default new Repo()
