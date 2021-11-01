import { MongoClient } from 'mongodb'
import bcrypt from 'bcrypt'

const mongoConnectionString = process.env.MONGO_CONNECTION_STRING || 'mongodb://localhost:27017/cs-builder'
const client = new MongoClient(mongoConnectionString)

class Repo {
  connect() {
    this.db = client.db('cs-builder')
    return client.connect()
  }

  seedUsers() {
    // this.update('users', { username: 'tim' }, { password: this.hashPassword('tim', '1Super') })
    // this.update('users', { username: 'clay' }, { password: this.hashPassword('clay', 'cact') })
    // this.update('users', { username: 'sam' }, { password: this.hashPassword('sam', 'sambam') })
    // this.insert('users', {
    //   username: 'tim',
    //   password: this.hashPassword('tim', ''),
    // })
    // this.insert('users', {
    //   username: 'clay',
    //   password: this.hashPassword('clay', ''),
    // })
    // this.insert('users', {
    //   username: 'sam',
    //   password: this.hashPassword('sam', ''),
    // })
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
    this.insert('users', {
      username: username,
      password: this.hashPassword(username, password),
    })
  }

  updateUserPassword(username, password) {
    return this.update('users', { username: username }, { password: this.hashPassword(username, password) })
  }

  assertUserOwnsProject(userId, projectId) {
    return this.db
      .collection('projects')
      .findOne({ id: projectId, owners: userId })
      .then(result => {
        return result != null ? Promise.resolve() : Promise.reject()
      })
      .catch(() => {
        return Promise.reject()
      })
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
