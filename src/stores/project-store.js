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
  Object.values(project.blocks).forEach(b => {
    b.graphic = nullIfInvalid(project.art, b.graphic)
  })

  Object.values(project.particles).forEach(p => {
    p.bringToFront = p.bringToFront == null ? true : p.bringToFront
    p.graphic = nullIfInvalid(project.art, p.graphic)
  })

  Object.values(project.characters).forEach(c => {
    c.particles = nullIfInvalid(project.particles, c.particles)
    c.graphics.still = nullIfInvalid(project.art, c.graphics.still)
    c.graphics.moving = nullIfInvalid(project.art, c.graphics.moving)
    c.abilities = c.abilities.map(a => ({
      ...a,
      graphics: {
        character: nullIfInvalid(project.art, a.graphics.character),
        projectile: nullIfInvalid(project.art, a.graphics.projectile),
      },
      particles: nullIfInvalid(project.particles, a.particles),
    }))
  })

  Object.values(project.enemies).forEach(e => {
    e.particles = nullIfInvalid(project.particles, e.particles)
    e.graphics.still = nullIfInvalid(project.art, e.graphics.still)
    e.graphics.moving = nullIfInvalid(project.art, e.graphics.moving)
    e.abilities = e.abilities.map(a => ({
      ...a,
      graphics: {
        character: nullIfInvalid(project.art, a.graphics.character),
        projectile: nullIfInvalid(project.art, a.graphics.projectile),
      },
      particles: nullIfInvalid(project.particles, a.particles),
    }))
  })

  Object.values(project.levels).forEach(l => {
    l.playableCharacters = l.playableCharacters.filter(c => project.characters.hasOwnProperty(c))
    l.blocks = l.blocks.filter(b => project.blocks.hasOwnProperty(b[0]))
    l.enemies = l.enemies.filter(e => project.enemies.hasOwnProperty(e[0]))
    // if (l.requiredLevels == null) l.requiredLevels = []
    // if (l.prerequisiiteLevels != null) delete l.prerequisiiteLevels
  })

  Object.values(project.blocks).forEach(b => {
    b.followerOnConsume = b.followerOnConsume.filter(c => project.characters.hasOwnProperty(c))
    b.enemyOnConsume = b.enemyOnConsume.filter(e => project.enemies.hasOwnProperty(e))
  })

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
