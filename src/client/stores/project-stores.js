import Cookies from 'js-cookie'
import api from '../services/api.js'
import io from 'socket.io-client'
import projectItemTypes from '../../server/project-item-types'
import { writable } from 'svelte/store'

const socket = io('/')

const LAST_PROJECT_ID = 'last-project-id'

const replaceInStore = (update, item) => update(items => items.map(i => (i.id == item.id ? item : i)))
const addToStore = (update, item) => update(items => [...items.filter(i => i.id != item.id), item])
const removeFromStore = (update, id) => update(items => items.filter(i => i.id != id))

let $project
export const project = createActiveProjectStore()
project.subscribe(p => {
  $project = p
})

export const user = createUserStore()
export const projects = createProjectsStore()
export const characters = createCharactersStore()

export const art = createProjectItemStore('art')
export const abilities = createProjectItemStore('abilities')
export const audio = createProjectItemStore('audio')
export const characterclasses = createProjectItemStore('characterclasses')
export const enemies = createProjectItemStore('enemies')
export const interactables = createProjectItemStore('interactables')
export const items = createProjectItemStore('items')
export const levels = createProjectItemStore('levels')
export const particles = createProjectItemStore('particles')
export const tiles = createProjectItemStore('tiles')

const itemTypeStores = { art, abilities, audio, characterclasses, enemies, interactables, items, levels, particles, tiles }

function createUserStore() {
  const { subscribe, set, update } = writable(null)

  // see if we already have a token in cookies
  const token = Cookies.get('access_token')
  if (token != null) {
    // parse jwt and populate user from that initially
    const jwt = JSON.parse(atob(token.split('.')[1]))
    set(jwt)
  }

  return {
    subscribe,
    login(username, password) {
      return api.users.login(username, password).then(user => {
        set(user)
        return user
      })
    },

    signup(username, password, confirmPassword) {
      return api.users.signup(username, password, confirmPassword).then(user => {
        set(user)
        return user
      })
    },

    logout() {
      api.users.logout().then(() => {
        set(null)
      })
    },

    apiGet() {
      return api.users.get().then(res => {
        set(res)
        return res
      })
    },

    apiUpdate(user) {
      return api.users.update(user).then(res => {
        set(res)
        return res
      })
    },
  }
}

function createActiveProjectStore() {
  const { subscribe, set, update } = writable(null)

  const customSet = p => {
    set(p)

    // mark it as last selected project in local storage
    if (p == null) return

    localStorage.setItem(LAST_PROJECT_ID, p.id)

    if (p.id == null) return

    // remove any missing references from levels
    // todo, should do the same for art, but instead we'll just make that fail gracefully
    const tileIds = p.tiles.map(t => t.id)
    const enemyIds = p.enemies.map(e => e.id)
    const itemIds = p.items.map(i => i.id)
    p.levels = p.levels.map(level => {
      level.tiles = level.tiles?.filter(t => tileIds.includes(t.id.toString()))
      level.enemies = level.enemies?.filter(e => enemyIds.includes(e.id.toString()))
      level.items = level.items?.filter(i => itemIds.includes(i.id.toString()))
      return level
    })

    // populate item stores with this project's stuff
    Object.keys(itemTypeStores).forEach(key => itemTypeStores[key].set(p[key]))
    characters.set([])
    characters.refresh()
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

  projectItemTypes.forEach(it => {
    socket.on(`${it}.insert`, item => {
      console.log(it, 'insert from server', item)
      if (item.projectId == $project.id) addToStore(itemTypeStores[it].update, item)
    })
    socket.on(`${it}.update`, item => {
      console.log(it, 'update from server', item)
      if (item.projectId == $project.id) replaceInStore(itemTypeStores[it].update, item)
    })
    socket.on(`${it}.delete`, ({ id, projectId }) => {
      console.log(it, 'delete from server', id, projectId)
      if (projectId == $project.id) removeFromStore(itemTypeStores[it].update, id)
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

  socket.on('projects.insert', p => {
    console.log('socket insert', res)
    addToStore(update, p)
  })
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

function createCharactersStore() {
  const { set, update, subscribe } = writable([])

  const refresh = () => {
    const projectId = $project.id
    console.log('loading characters for project', projectId)
    return api.characters.find(projectId).then(characters => {
      set(characters)
      return characters
    })
  }

  return {
    subscribe,
    set,
    update,
    refresh,

    loadForProject(projectId) {
      api.characters.find(projectId).then(response => {
        set(response)
      })
    },

    apiInsert(item) {
      return api.characters.insert(item).then(res => {
        addToStore(update, res)
        return res
      })
    },

    apiUpdate(item) {
      return api.characters.update(item).then(res => {
        replaceInStore(update, res)
        return res
      })
    },

    apiDelete(id) {
      return api.characters.delete(id).then(() => {
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
        addToStore(update, res)
        return res
      })
    },

    apiUpdate(item) {
      return api[itemTypeName].update(item).then(res => {
        replaceInStore(update, res)
        return res
      })
    },

    apiDelete(projectId, id) {
      return api[itemTypeName].delete(projectId, id).then(() => {
        removeFromStore(update, id)
      })
    },
  }
}
