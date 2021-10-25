import express from 'express'
import { Server as SocketIO } from 'socket.io'
import path from 'path'
import { Server } from 'http'

import projectItemTypes from './project-item-types.js'
import repo from './repo.js'

const app = express()
const http = Server(app)
const staticPath = path.resolve('public')
const io = new SocketIO(http)

app.use(express.static(staticPath))
app.use(express.json())

// https://zellwk.com/blog/crud-express-mongodb/
// this article recommended connecting then putting handlers inside callback.. seems like it'd be flaky, but mongodb is supposed to handle connection pooling internally, so maybe fine?
repo.connect().then(() => {
  // app.get('/api/migrate-tiles', (req, res) => {
  //   repo.migrateToTiles()
  //   res.json(true)
  // })

  // list projects
  app.get('/api/projects', (req, res) => {
    repo.find('projects').then(projects => {
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
  app.post('/api/projects', (req, res) => {
    console.log('adding project', req.body)
    repo.find('projects').then(projects => {
      const item = req.body
      item.id = (
        projects.length
          ? projects
              .map(p => parseInt(p.id))
              .sort((a, b) => (a < b ? -1 : 1))
              .pop() + 1
          : 0
      ).toString()

      repo.insert('projects', item).then(dbres => {
        item._id = dbres.insertedid
        io.emit('projects.insert', item)
        res.json(item)
      })
    })
  })

  // update project
  app.put('/api/projects/:id', (req, res) => {
    const project = req.body
    project.id = req.params.id
    repo.update('projects', { id: project.id }, project).then(() => {
      io.emit('projects.update', project)
      res.json(project)
    })
  })

  // delete project
  app.delete('/api/projects/:id', (req, res) => {
    // delete project
    repo.delete('projects', { id: req.params.id }).then(() => {
      // delete project items
      Promise.all(projectItemTypes.map(it => repo.deleteMany(it, { projectId: req.params.id }))).then(() => {
        io.emit('projects.delete', req.params.id)
        res.json(true)
      })
    })
  })

  // crud for project child collections
  projectItemTypes.forEach(c => {
    // list
    app.get(`/api/projects/:projectId/${c}`, (req, res) => {
      repo.find(c, { projectId: req.params.projectId }).then(objects => res.json(objects))
    })

    // get
    app.get(`/api/projects/:projectId/${c}/:id`, (req, res) => {
      repo.get(c, { projectId: req.params.projectId, id: req.params.id }).then(object => res.send(object))
    })

    // add
    app.post(`/api/projects/:projectId/${c}`, (req, res) => {
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

    // update
    app.put(`/api/projects/:projectId/${c}/:id`, (req, res) => {
      const item = req.body
      item.projectId = req.params.projectId
      item.id = req.params.id
      console.log('updating', item)
      repo.update(c, { projectId: item.projectId, id: item.id }, item).then(() => {
        io.emit(`${c}.update`, item)
        res.json(item)
      })
    })

    // delete
    app.delete(`/api/projects/:projectId/${c}/:id`, (req, res) => {
      repo.delete(c, { projectId: req.params.projectId, id: req.params.id }).then(() => {
        io.emit(`${c}.delete`, {
          projectId: req.params.projectId,
          id: req.params.id,
        })
        res.json(true)
      })
    })
  })

  /////// sockets ///////
  io.on('connection', socket => {
    // socket.on('login', (name, password) => {
    //   socket.user = db.users.find(u => u.name == name && u.password == password) || { name: `Guest ${socket.id}` }
    // })

    socket.on('disconnect', () => console.log(`socket ${socket.user?.name ?? 'guest'} disconnected`))
    // listen for socket events / send socket events
    // socket.on('event-name', payload => { /* client sent something */ })
    // socket.emit('event-name', payload) send to just this socket
    // io.emit('event-name', payload) send to everyone
  })

  const port = process.env.PORT || 4999
  http.listen(port, () => console.log(`Server listening on *:${port}`))
})
