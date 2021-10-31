import * as PIXI from 'pixi.js'

import { enemies, items, tiles } from '../stores/project-stores.js'

import Enemy from '../classes/Enemy.js'
import Item from '../classes/Item.js'
import LevelGrid from '../classes/LevelGrid.js'
import ParticleEmitter from './ParticleEmitter'
import Tile from '../classes/Tile.js'

let $tiles, $items, $enemies
tiles.subscribe(t => ($tiles = t))
items.subscribe(t => ($items = t))
enemies.subscribe(t => ($enemies = t))

export function emptyContainer(container) {
  container?.children.forEach(c => {
    container.removeChild(c)
    c.destroy()
  })
}

export default class World extends PIXI.Container {
  constructor(tiles, level, gridSize) {
    super()

    this.level = level

    this.levelGrid = new LevelGrid(tiles, level, gridSize)

    this.tileContainer = new PIXI.Container()
    this.addChild(this.tileContainer)

    this.itemContainer = new PIXI.Container()
    this.addChild(this.itemContainer)

    this.enemyContainer = new PIXI.Container()
    this.addChild(this.enemyContainer)

    this.projectileContainer = new PIXI.Container()
    this.addChild(this.projectileContainer)

    this.particleContainer = new PIXI.Container()
    this.addChild(this.particleContainer)
  }

  makeParticles(art) {
    if (art) {
      // const particleTexture = ability.particleArt ? PIXI.Texture.from(ability.particleArt.png) : null
      const particleTexture = PIXI.Texture.from(art.png)
      const particle = new ParticleEmitter(particleTexture, this.particleContainer, this.rotation)
      particle.move(this.x, this.y)
      this.particles.push(particle)
    }
  }
}
