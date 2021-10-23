import { writable } from 'svelte/store'
import api from '../services/api.js'

const LAST_PROJECT_ID = 'last-project-id'

export const project = createActiveProjectStore()
export const projects = createProjectsStore()
export const art = createProjectItemStore('art')
export const blocks = createProjectItemStore('blocks')
export const characters = createProjectItemStore('characters')
export const enemies = createProjectItemStore('enemies')
export const items = createProjectItemStore('items')
export const levels = createProjectItemStore('levels')
export const particles = createProjectItemStore('particles')

function createActiveProjectStore() {
  const { subscribe, set } = writable({})

  const customSet = p => {
    set(p)

    // mark it as last selected project in local storage
    if (p == null) return

    localStorage.setItem(LAST_PROJECT_ID, p.id)

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

  return {
    subscribe,
    set,
    refresh,

    insert(p) {
      console.log('inserting', p)
      return api.projects.insert(p).then(res => {
        update(projects => [...projects, res])
        return res
      })
    },

    update(p) {
      return api.projects.update(p).then(res => {
        update(projects => projects.map(i => (i.id == res.id ? res : i)))
        return res
      })
    },

    delete(id) {
      return api.projects.delete(id).then(() => {
        update(projects => projects.filter(p => p.id != id))
      })
    },
  }
}

function createProjectItemStore(itemTypeName) {
  const { set, update, subscribe } = writable([])
  return {
    subscribe,
    set,

    // might not be necessary
    // projects.get() returns all the child item collections populated
    loadForProject(projectId) {
      api[itemTypeName].find(projectId).then(response => {
        set(response)
      })
    },

    insert(item) {
      return api[itemTypeName].insert(item).then(res => {
        update(c => [...c, res])
        return res
      })
    },

    update(item) {
      return api[itemTypeName].update(item).then(res => {
        update(c => c.map(o => (o.id == res.id ? item : o)))
        return res
      })
    },

    delete(projectId, id) {
      return api[itemTypeName].delete(projectId, id).then(() => {
        update(c => c.filter(o => o.id != id))
      })
    },
  }
}
