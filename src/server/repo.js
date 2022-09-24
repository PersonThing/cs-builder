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

  insertMany(collectionName, objects) {
    return this.db.collection(collectionName).insertMany(objects)
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

  assertUserOwnsCharacter(username, characterId) {
    return this.db
      .collection('characters')
      .findOne({ id: characterId, username })
      .then(result => {
        return result != null ? Promise.resolve() : Promise.reject()
      })
      .catch(() => {
        return Promise.reject()
      })
  }

  export() {
    const collections = ['abilities', 'art', 'audio', 'characterclasses', 'characters', 'enemies', 'items', 'levels', 'projects', 'tiles', 'users']
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

  renameItems() {
    return this.db.collection('levels').updateMany({}, { $unset: { items: 1 } })
  }
}

export default new Repo()
