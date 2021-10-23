import { writable } from 'svelte/store'
import api from '../services/api.js'
import io from 'socket.io-client'

const socket = io('/')

const LAST_PROJECT_ID = 'last-project-id'

const replaceInStore = (update, item) => update(items => items.map(i => (i.id == item.id ? item : i)))
const addToStore = (update, item) => update(items => [...items.filter(i => i.id != item.id), item])
const removeFromStore = (update, id) => update(items => items.filter(i => i.id != id))

const itemTypeNames = ['art', 'blocks', 'characters', 'enemies', 'items', 'levels']

let $project
export const project = createActiveProjectStore()
project.subscribe(p => {
  $project = p
})
export const projects = createProjectsStore()

export const art = createProjectItemStore('art')
export const blocks = createProjectItemStore('blocks')
export const characters = createProjectItemStore('characters')
export const enemies = createProjectItemStore('enemies')
export const items = createProjectItemStore('items')
export const levels = createProjectItemStore('levels')
export const particles = createProjectItemStore('particles')

const stores = { art, blocks, characters, enemies, items, levels }

function createActiveProjectStore() {
  const { subscribe, set, update } = writable({})

  const customSet = p => {
    set(p)

    // mark it as last selected project in local storage
    if (p == null) return

    localStorage.setItem(LAST_PROJECT_ID, p.id)

    if (p.id == null) return

    // populate item stores with this project's stuff
    art.set(p.art)
    blocks.set(p.blocks)
    characters.set(p.characters)
    enemies.set(p.enemies)
    items.set(p.items)
    levels.set(p.levels)
  }

  const loadFromApi = id => {
    return api.projects.get(id).then(res => customSet(res))
  }

  // set from server initially, and set active project on first load
  const lastProjectId = localStorage.getItem(LAST_PROJECT_ID)
  if (lastProjectId != null) loadFromApi(lastProjectId)

  // listen for changes on server
  socket.on('projects.update', p => {
    console.log('project update from server', p)
    if ($project.id == p.id) {
      update(v => {
        v.name = p.name
        v.pixelSize = p.pixelSize
      })
    }
  })

  socket.on('projects.delete', id => {
    console.log('project delete from server', id)
    update(v => {
      if (v.id == id) {
        customSet({})
      }
    })
  })

  itemTypeNames.forEach(it => {
    socket.on(`${it}.insert`, item => {
      console.log(it, 'insert from server', item)
      if (item.projectId == $project.id) addToStore(stores[it].update, item)
    })
    socket.on(`${it}.update`, item => {
      console.log(it, 'update from server', item)
      if (item.projectId == $project.id) replaceInStore(stores[it].update, item)
    })
    socket.on(`${it}.delete`, ({ id, projectId }) => {
      console.log(it, 'delete from server', id, projectId)
      if (projectId == $project.id) removeFromStore(stores[it].update, id)
    })
  })

  return {
    subscribe,
    loadFromApi,
    set: customSet,
  }
}

function createProjectsStore() {
  const { subscribe, set, update } = writable([])
  const refresh = () => {
    return api.projects.find().then(projects => {
      set(projects)
      return projects
    })
  }

  socket.on('projects.insert', p => addToStore(update, p))
  socket.on('projects.update', p => replaceInStore(update, p))
  socket.on('projects.update', id => removeFromStore(update, id))

  return {
    subscribe,
    set,
    refresh,

    apiInsert(p) {
      return api.projects.insert(p).then(res => {
        addToStore(update, res)
        return res
      })
    },

    apiUpdate(p) {
      return api.projects.update(p).then(res => {
        replaceInStore(update, res)
        return res
      })
    },

    apiDelete(id) {
      return api.projects.delete(id).then(() => {
        removeFromStore(update, id)
      })
    },
  }
}

function createProjectItemStore(itemTypeName) {
  const { set, update, subscribe } = writable([])
  return {
    subscribe,
    set,
    update,

    // might not be necessary
    // projects.get() returns all the child item collections populated
    loadForProject(projectId) {
      api[itemTypeName].find(projectId).then(response => {
        set(response)
      })
    },

    apiInsert(item) {
      return api[itemTypeName].insert(item).then(res => {
        update(c => [...c, res])
        return res
      })
    },

    apiUpdate(item) {
      return api[itemTypeName].update(item).then(res => {
        update(c => c.map(o => (o.id == res.id ? item : o)))
        return res
      })
    },

    apiDelete(projectId, id) {
      return api[itemTypeName].delete(projectId, id).then(() => {
        update(c => c.filter(o => o.id != id))
      })
    },
  }
}
