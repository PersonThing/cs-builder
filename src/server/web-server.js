import { Server } from 'http'
import { Server as SocketIO } from 'socket.io'
import cookieParser from 'cookie-parser'
import express from 'express'
import jwt from 'jsonwebtoken'
import path from 'path'
import projectItemTypes from './project-item-types.js'
import repo from './repo.js'
import stripProjectOfItems from '../client/services/strip-project-of-items.js'

const app = express()
const http = Server(app)
const staticPath = path.resolve('public')
const io = new SocketIO(http)

app.use(express.static(staticPath))
app.use(express.json({ limit: '50mb' }))
app.use(cookieParser())

const jwtCookieName = 'access_token'
const jwtSecret = 'my-super-secret-key'
const authorization = (req, res, next) => {
  const token = req.cookies.access_token
  if (!token) {
    return res.sendStatus(403)
  }
  try {
    const data = jwt.verify(token, jwtSecret)
    req.userid = data.userid
    req.username = data.username
    return next()
  } catch {
    return res.sendStatus(403)
  }
}

const assertUserOwnsProject = (username, projectId, response) => {
  return new Promise((resolve, reject) => {
    repo
      .assertUserOwnsProject(username, projectId)
      .then(resolve)
      .catch(() => {
        response.status(403).json({ message: 'You are not allowed to change this project' })
      })
  })
}

const assertUserOwnsCharacter = (username, characterId, response) => {
  return new Promise((resolve, reject) => {
    repo
      .assertUserOwnsCharacter(username, characterId)
      .then(resolve)
      .catch(() => {
        response.status(403).json({ message: 'You are not allowed to change this character' })
      })
  })
}

// https://zellwk.com/blog/crud-express-mongodb/
// this article recommended connecting then putting handlers inside callback.. seems like it'd be flaky, but mongodb is supposed to handle connection pooling internally, so maybe fine?
repo.connect().then(() => {
  // export all data
  app.get('/api/export', (req, res) => {
    repo.export().then(data => {
      res.json(data)
    })
  })

  // rename items to interactables (remove this once it's done on prod)
  app.get('/api/rename-items', (req, res) => {
    repo.renameItems().then(() => {
      res.status(200).json(true)
    })
  })

  // login
  const sendUserResponse = (res, user) => {
    const token = jwt.sign(user, jwtSecret)
    res.cookie(jwtCookieName, token, { secure: true }).json({
      ...user,
      token,
    })
  }
  app.post('/api/login', (req, res) => {
    repo.getUserByNameAndPassword(req.body.username, req.body.password).then(user => {
      if (user) {
        sendUserResponse(res, user)
      } else {
        res.status(401).json({ message: 'Invalid username or password' })
      }
    })
  })

  app.post('/api/signup', (req, res) => {
    if (req.body.username.length < 3) return res.status(400).json({ message: 'Username must be at least 3 characters long' })
    if (req.body.password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters long' })
    if (req.body.password != req.body.confirmPassword) return res.status(400).json({ message: 'Passwords do not match' })
    repo.getUserByName(req.body.username).then(user => {
      if (user) {
        res.status(400).json({ message: 'Username already taken' })
      } else {
        repo.createUser(req.body.username, req.body.password).then(user => {
          sendUserResponse(res, user)
        })
      }
    })
  })

  app.get('/api/logout', authorization, (req, res) => {
    res.clearCookie(jwtCookieName).json(true)
  })

  app.get('/api/seed-users', (req, res) => {
    repo.seedUsers()
    res.json({ success: true })
  })

  // list all projects
  app.get('/api/projects', (req, res) => {
    repo.find('projects').then(projects => {
      res.json(projects)
    })
  })

  // list my projects
  app.get('/api/my-projects', authorization, (req, res) => {
    repo.find('projects', { owners: req.username }).then(projects => {
      res.json(projects)
    })
  })

  // get project
  app.get('/api/projects/:id', (req, res) => {
    // get project from db
    repo.get('projects', { id: req.params.id }).then(project => {
      if (project == null) return {}
      // populate all its collections to save ui requests
      Promise.all(
        projectItemTypes.map(it =>
          repo.find(it, { projectId: req.params.id }).then(items => {
            project[it] = items
          })
        )
      ).then(() => res.json(project))
    })
  })

  // add project
  app.post('/api/projects', authorization, (req, res) => {
    console.log('adding project', stripProjectOfItems(req.body))
    repo.find('projects').then(projects => {
      const project = req.body
      project.id = (
        projects.length
          ? projects
              .map(p => parseInt(p.id))
              .sort((a, b) => (a < b ? -1 : 1))
              .pop() + 1
          : 0
      ).toString()

      // mark as owned by this user
      project.owners = [req.username]

      // for any items in the project, set the projectId to the new one
      const definedProjectItemTypes = projectItemTypes.filter(it => project[it] != null && project[it].length > 0)

      definedProjectItemTypes.map(it => {
        project[it].map(item => {
          item.projectId = project.id
        })
      })

      // insert the stripped-down project
      const strippedProject = stripProjectOfItems(project)
      repo.insert('projects', strippedProject).then(dbres => {
        strippedProject._id = dbres.insertedid

        // insert any items it had
        Promise.all(definedProjectItemTypes.map(it => repo.insertMany(it, project[it]))).then(() => {
          io.emit('projects.insert', strippedProject)
          res.json(strippedProject)
        })
      })
    })
  })

  // update project
  app.put('/api/projects/:id', authorization, (req, res) => {
    const project = req.body
    project.id = req.params.id
    // make sure user owns this project first
    assertUserOwnsProject(req.username, project.id, res).then(() => {
      repo.update('projects', { id: project.id }, project).then(() => {
        io.emit('projects.update', project)
        res.json(project)
      })
    })
  })

  // delete project
  app.delete('/api/projects/:id', authorization, (req, res) => {
    assertUserOwnsProject(req.username, req.params.id, res).then(() => {
      repo.delete('projects', { id: req.params.id }).then(() => {
        // delete project items
        Promise.all(projectItemTypes.map(it => repo.deleteMany(it, { projectId: req.params.id }))).then(() => {
          io.emit('projects.delete', req.params.id)
          res.json(true)
        })
      })
    })
  })

  // character crud
  app.get('/api/characters/:projectId', authorization, (req, res) => {
    console.log('finding characters for project', req.params.projectId, req.username)
    repo.find('characters', { projectId: req.params.projectId, username: req.username }).then(characters => {
      res.json(characters)
    })
  })

  app.post('/api/characters', authorization, (req, res) => {
    const item = req.body
    item.projectId = req.body.projectId
    item.username = req.username
    item.level = 1
    item.xp = 0

    repo.find('characters', { username: req.username }).then(characters => {
      const item = req.body
      item.id = (
        characters.length
          ? characters
              .map(ch => parseInt(ch.id))
              .sort((a, b) => (a < b ? -1 : 1))
              .pop() + 1
          : 0
      ).toString()

      repo.insert('characters', item).then(dbres => {
        item._id = dbres.insertedid
        io.emit('characters.insert', item)
        res.json(item)
      })
    })
  })

  app.put('/api/characters/:id', authorization, (req, res) => {
    // TODO: validate changes they're making...
    // if we make the game server-side, we won't need this api at all, server can just periodically sync character state to mongo
    assertUserOwnsCharacter(req.username, req.body.id, res).then(() => {
      req.body.id = req.params.id
      repo.update('characters', { username: req.username, id: req.params.id }, req.body).then(() => {
        io.emit('characters.update', req.body)
        res.json(req.body)
      })
    })
  })

  app.delete('/api/characters/:id', authorization, (req, res) => {
    console.log('trying to delete', req.params.id, req.username)
    assertUserOwnsCharacter(req.username, req.params.id, res).then(() => {
      repo.delete('characters', { username: req.username, id: req.params.id }).then(() => {
        io.emit('characters.delete', req.params.id)
        res.json(true)
      })
    })
  })

  // crud for project child collections
  projectItemTypes.forEach(c => {
    // list
    app.get(`/api/projects/:projectId/${c}`, authorization, (req, res) => {
      repo.find(c, { projectId: req.params.projectId }).then(objects => res.json(objects))
    })

    // get
    app.get(`/api/projects/:projectId/${c}/:id`, authorization, (req, res) => {
      repo.get(c, { projectId: req.params.projectId, id: req.params.id }).then(object => res.send(object))
    })

    // add
    app.post(`/api/projects/:projectId/${c}`, authorization, (req, res) => {
      assertUserOwnsProject(req.username, req.params.projectId, res).then(() => {
        repo.find(c, { projectId: req.params.projectId }).then(collection => {
          const item = req.body
          item.id = (
            collection.length
              ? collection
                  .map(c => parseInt(c.id))
                  .sort((a, b) => (a < b ? -1 : 1))
                  .pop() + 1
              : 0
          ).toString()
          repo.insert(c, item).then(dbres => {
            item._id = dbres.insertedid
            io.emit(`${c}.insert`, item)
            res.json(item)
          })
        })
      })
    })

    // update
    app.put(`/api/projects/:projectId/${c}/:id`, authorization, (req, res) => {
      assertUserOwnsProject(req.username, req.params.projectId, res).then(() => {
        const item = req.body
        item.projectId = req.params.projectId
        item.id = req.params.id
        repo.update(c, { projectId: item.projectId, id: item.id }, item).then(() => {
          io.emit(`${c}.update`, item)
          res.json(item)
        })
      })
    })

    // delete
    app.delete(`/api/projects/:projectId/${c}/:id`, authorization, (req, res) => {
      assertUserOwnsProject(req.username, req.params.projectId, res).then(() => {
        repo.delete(c, { projectId: req.params.projectId, id: req.params.id }).then(() => {
          io.emit(`${c}.delete`, {
            projectId: req.params.projectId,
            id: req.params.id,
          })
          res.json(true)
        })
      })
    })
  })

  /////// sockets ///////
  io.on('connection', socket => {
    // socket.on('login', (name, password) => {
    //   socket.user = db.users.find(u => u.name == name && u.password == password) || { name: `Guest ${socket.id}` }
    // })

    socket.on('disconnect', () => console.log(`socket disconnected`))
    // listen for socket events / send socket events
    // socket.on('event-name', payload => { /* client sent something */ })
    // socket.emit('event-name', payload) send to just this socket
    // io.emit('event-name', payload) send to everyone
  })

  const port = process.env.PORT || 4999
  http.listen(port, () => console.log(`Server listening on *:${port}`))
})
