import { MongoClient } from 'mongodb'
import bcrypt from 'bcrypt'

const mongoConnectionString = process.env.DATABASE_URL || 'mongodb://localhost:27017/cs-builder'
const client = new MongoClient(mongoConnectionString, {
  tlsAllowInvalidCertificates: true,
})

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

  export() {
    const collections = ['abilities', 'art', 'audio', 'characters', 'enemies', 'items', 'levels', 'projects', 'tiles', 'users']
    const results = {}
    const promises = collections.map(collectionName => {
      return this.find(collectionName).then(rows => {
        results[collectionName] = rows
      })
    })
    return Promise.all(promises).then(() => {
      return results
    })
  }

  getUserByName(username) {
    return this.db
      .collection('users')
      .findOne({ username: username })
      .then(user => {
        return user
          ? {
              userid: user._id,
              username: user.username,
            }
          : null
      })
  }

  getUserByNameAndPassword(username, password) {
    return this.db
      .collection('users')
      .findOne({
        username: username,
      })
      .then(user => {
        if (user && bcrypt.compareSync(password, user.password)) {
          return {
            userid: user._id,
            username: user.username,
          }
        }
        return null
      })
  }

  hashPassword(username, password) {
    const salt = bcrypt.genSaltSync(username.length)
    return bcrypt.hashSync(password, salt)
  }

  createUser(username, password) {
    return this.insert('users', {
      username: username,
      password: this.hashPassword(username, password),
    }).then(() => this.getUserByName(username))
  }

  updateUserPassword(username, password) {
    return this.update('users', { username: username }, { password: this.hashPassword(username, password) })
  }

  assertUserOwnsProject(username, projectId) {
    return this.db
      .collection('projects')
      .findOne({ id: projectId, owners: username })
      .then(result => {
        return result != null ? Promise.resolve() : Promise.reject()
      })
      .catch(() => {
        return Promise.reject()
      })
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
