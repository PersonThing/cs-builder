import * as PIXI from 'pixi.js'
import Enemy from '../classes/Enemy.js'
import Tile from '../classes/Tile.js'
import Item from '../classes/Item.js'
import LevelGrid from '../classes/LevelGrid.js'
import ParticleEmitter from './ParticleEmitter'

import { tiles, items, enemies } from '../stores/project-stores.js'

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

    this.redrawTiles()
    this.redrawItems()
    this.redrawEnemies()
  }

  redrawTiles() {
    emptyContainer(this.tileContainer)
    for (const tileConfig of this.level.tiles) {
      const bc = $tiles.find(b => b.id == tileConfig.id)
      if (bc == null) continue
      const tile = new Tile(
        bc,
        $art.find(a => a.id == bc.graphic),
        tileConfig,
        gridSize
      )
      this.tileContainer.addChild(tile)
    }
  }

  redrawItems() {
    emptyContainer(this.itemContainer)
    for (const itemConfig of this.level.items) {
      const ic = $items.find(i => i.id == itemConfig.id)
      const item = new Item(
        ic,
        $art.find(a => a.id == ic.graphics.still),
        $audio.find(au => au.id == ic.audioOnCollision),
        itemConfig,
        gridSize
      )
      this.itemContainer.addChild(item)
    }
  }

  redrawEnemies() {
    emptyContainer(this.enemyContainer)
    for (const enemyConfig of this.level.enemies) {
      const e = $enemies.find(e => e.id == enemyConfig.id)
      const enemy = new Enemy(
        this,
        // function to get enemies for enemies
        () => [player],
        e,
        buildGraphics(e.graphics),
        buildAbilities(e.abilities),
        enemyConfig.x * gridSize + gridSize / 2,
        enemyConfig.y * gridSize + gridSize / 2,
        this.levelGrid,
        this.level.showPaths,
        this.level.showSightRadius
      )
      this.enemyContainer.addChild(enemy)
    }
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
