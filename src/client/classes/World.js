import * as PIXI from 'pixi.js'
import emptyContainer from '../services/empty-container.js'
import Enemy from './Enemy.js'
import Item from './Item.js'
import Player from './Player.js'
import Tile from './Tile.js'
import { art, abilities, audio, enemies, items, tiles } from '../stores/project-stores.js'
let $art, $abilities, $audio, $enemies, $items, $tiles
art.subscribe(v => ($art = v))
abilities.subscribe(v => ($abilities = v))
audio.subscribe(v => ($audio = v))
enemies.subscribe(v => ($enemies = v))
items.subscribe(v => ($items = v))
tiles.subscribe(v => ($tiles = v))

function buildGraphics(graphicIds) {
  const graphics = {}
  Object.keys(graphicIds).forEach(key => {
    graphics[key] = $art.find(a => a.id == graphicIds[key])
  })
  return graphics
}

function buildAbilities(charAbilities) {
  return charAbilities.map(charAbility => {
    const ability = $abilities.find(ab => ab.id == charAbility.id)
    const graphics = {}
    Object.keys(ability.graphics).forEach(k => {
      graphics[k] = $art.find(a => a.id == ability.graphics[k])
    })
    return {
      ...ability,
      key: charAbility.key,
      graphics,
      characterArt: $art.find(ar => ar.id == charAbility.characterArt),
      audioOnUse: $audio.find(au => au.id == ability.audioOnUse),
      audioOnHit: $audio.find(au => au.id == ability.audioOnHit),
      nextFire: 0,
    }
  })
}

export default class World extends PIXI.Container {
  constructor(levelGrid, level) {
    super()
    this.levelGrid = levelGrid
    this.level = level
    this.sortableChildren = true

    this.tileContainer = new PIXI.Container()
    this.addChild(this.tileContainer)
    this.redrawTiles()

    this.itemContainer = new PIXI.Container()
    this.addChild(this.itemContainer)
    this.redrawItems()

    this.enemyContainer = new PIXI.Container()
    this.addChild(this.enemyContainer)
    this.redrawEnemies()

    this.projectileContainer = new PIXI.Container()
    this.addChild(this.projectileContainer)

    this.particleContainer = new PIXI.Container()
    this.addChild(this.particleContainer)
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
        this.levelGrid.gridSize
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
        this.levelGrid.gridSize
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
        () => this.getAllies(),
        () => this.getEnemies(),
        e,
        $audio.find(au => au.id == e.audioOnDeath),
        buildGraphics(e.graphics),
        buildAbilities(e.abilities),
        enemyConfig.x * this.levelGrid.gridSize + this.levelGrid.gridSize / 2,
        enemyConfig.y * this.levelGrid.gridSize + this.levelGrid.gridSize / 2,
        this.levelGrid,
        this.level.showPaths,
        this.level.showSightRadius
      )
      this.enemyContainer.addChild(enemy)
    }
  }

  createPlayer(character, characterClass) {
    const audioOnDeath = $audio.find(au => au.id === characterClass.audioOnDeath)
    this.player = new Player(
      this,
      () => this.getEnemies(),
      () => this.getAllies(),
      character,
      characterClass,
      audioOnDeath,
      buildGraphics(characterClass.graphics),
      buildAbilities(characterClass.abilities),
      1.5 * this.levelGrid.gridSize,
      1.5 * this.levelGrid.gridSize,
      this.levelGrid,
      this.level.showPaths
    )
    this.addChild(this.player)
    return this.player
  }

  getEnemies() {
    return this.enemyContainer?.children.filter(e => e.config != null)
  }

  getAllies() {
    return [this.player]
  }

  onTick(pointerPosition, keys) {
    const time = performance.now()
    if (this.player && this.enemyContainer) {
      this.player.onTick(
        time,
        Object.keys(keys).filter(k => keys[k]),
        pointerPosition
      )
      this.getEnemies().forEach(enemy => {
        // if enemy can see player, target player
        // otherwise clear their target
        if (enemy.canSee(this.player)) {
          enemy.setTarget(this.player)
        } else {
          enemy.clearPathAfterCurrentTarget()
        }
        enemy.onTick(time)
      })
      this.projectileContainer.children.forEach(projectile => projectile.onTick(time))
    }
    this.checkCollisions()
  }

  checkCollisions() {
    this.itemContainer?.children.forEach(item => {
      if (item.config.playersCanUse && this.player) this.checkAndHandleItemCollision(this.player, item)
      if (item.config.enemiesCanUse) {
        this.getEnemies().forEach(enemy => this.checkAndHandleItemCollision(enemy, item))
      }
    })
  }

  checkAndHandleItemCollision(sprite, item) {
    if (sprite.isTouching(item)) {
      item.onCollision(sprite, this)
      if (item.config.removeOnCollision) {
        this.itemContainer.removeChild(item)
        item.destroy()
      }
    }
  }

  centerViewOnPlayer(screenCenter) {
    this.x = screenCenter.x
    this.y = screenCenter.y
    this.pivot.x = this.player.x
    this.pivot.y = this.player.y
  }
}
