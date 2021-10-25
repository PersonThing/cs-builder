import { MongoClient } from 'mongodb'

const mongoConnectionString = 'mongodb://localhost:27017/cs-builder'
const client = new MongoClient(mongoConnectionString)

class Repo {
  connect() {
    this.db = client.db('cs-builder')
    return client.connect()
  }

  insert(collectionName, object) {
    return this.db.collection(collectionName).insertOne(object)
  }

  update(collectionName, keys, newValue) {
    if (newValue._id != null) delete newValue._id
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
    return (
      this.db
        .collection(collectionName)
        .find(filters)
        // sort case-insensitive
        .collation({ locale: 'en' })
        .sort({ name: 1 })
        .toArray()
    )
  }
}

export default new Repo()

// migrateToTiles() {
//   const blocks = this.db
//     .collection('blocks')
//     .find({})
//     .toArray()
//     .then(blocks => {
//       this.db.collection('tiles').insertMany(blocks)
//     })
// }

// resetMongo() {
//   const projectItemTypes = ['art', 'tiles', 'items', 'characters', 'levels', 'enemies']

//   projectItemTypes.forEach(cn => {
//     let items = database.projects.flatMap(p =>
//       Object.values(p[cn]).map(e => ({
//         ...e,
//         projectId: p.id.toString(),
//         id: e.id.toString(),
//       }))
//     )

//     // strip some unused stuff on tiles
//     if (cn == 'tiles') {
//       items = items.map(b => ({
//         id: b.id,
//         projectId: b.projectId,
//         name: b.name,
//         graphic: b.graphic,
//         canWalk: b.canWalk,
//         canSee: b.canSee,
//       }))
//     }

//     // delete everything that was there
//     this.db
//       .collection(cn)
//       .deleteMany({})
//       .then(() => {
//         // insert new ones
//         this.db.collection(cn).insertMany(items)
//       })
//   })
// }
