import LocalStorageStore from './local-storage-store'
import sampleProjects from './sample-projects.json'

export const PROJECT_VERSION = 1

const defaultValue = [...sampleProjects]

// migrate any existing projects to fix keys / etc
const oldProjectsValue = localStorage.getItem('projects')
const projectsValue = (oldProjectsValue != null ? JSON.parse(oldProjectsValue) : defaultValue).map(p => migrateProject(p))
localStorage.setItem('projects', JSON.stringify(projectsValue))

function migrateProject(project) {
  if (project.version == null) project.version = 0

  project = cleanup(project)
  return project
}

export function cleanup(project) {
  if (project.blocks == null) project.blocks = {}
  if (project.particles == null) project.particles = {}
  if (project.art == null) project.art = {}
  if (project.enemies == null) project.enemies = {}
  if (project.characters == null) project.characters = {}
  if (project.blocks == null) project.blocks = {}
  if (project.levels == null) project.levels = {}

  return project
}

function nullIfInvalid(collection, key) {
  return key != null && collection[key] != null ? key : null
}

const { subscribe, set } = LocalStorageStore('projects', projectsValue)
export default {
  subscribe,

  // whenever they save projects, clean all projects up
  set: function (value) {
    return set(value.map(p => cleanup(p)))
  },
}

export function getNextId(collection) {
  const maxId = Object.values(collection)
    .map(c => c.id)
    .sort((a, b) => a.id < b.id)
    .pop()
  return maxId == null ? 0 : maxId + 1
}
