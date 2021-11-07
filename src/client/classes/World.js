import * as PIXI from 'pixi.js'
import emptyContainer from '../services/empty-container.js'
import Enemy from './Enemy.js'
import Interactable from './Interactable.js'
import Player from './Player.js'
import Tile from './Tile.js'
import { art, abilities, audio, enemies, interactables, items, tiles } from '../stores/project-stores.js'

let $art, $abilities, $audio, $enemies, $interactables, $items, $tiles
art.subscribe(v => ($art = v))
abilities.subscribe(v => ($abilities = v))
audio.subscribe(v => ($audio = v))
enemies.subscribe(v => ($enemies = v))
interactables.subscribe(v => ($interactables = v))
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
    this.tileContainer.zIndex = 1
    this.addChild(this.tileContainer)
    this.redrawTiles()

    this.interactableContainer = new PIXI.Container()
    this.interactableContainer.zIndex = 2
    this.addChild(this.interactableContainer)
    this.redrawInteractables()

    // TODO: when items drop they should go in this container
    this.itemContainer = new PIXI.Container()
    this.itemContainer.zIndex = 3
    this.addChild(this.itemContainer)

    this.projectileContainer = new PIXI.Container()
    this.projectileContainer.zIndex = 4
    this.addChild(this.projectileContainer)

    this.particleContainer = new PIXI.Container()
    this.particleContainer.zIndex = 5
    this.addChild(this.particleContainer)

    this.enemyContainer = new PIXI.Container()
    this.enemyContainer.zIndex = 11
    this.addChild(this.enemyContainer)
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
        this.levelGrid.gridSize
      )
      this.tileContainer.addChild(tile)
    }
  }

  redrawInteractables() {
    emptyContainer(this.interactableContainer)
    for (const intConfig of this.level.interactables) {
      const ic = $interactables.find(i => i.id == intConfig.id)
      const interactable = new Interactable(
        ic,
        $art.find(a => a.id == ic.graphics.still),
        $audio.find(au => au.id == ic.audioOnCollision),
        intConfig,
        this.levelGrid.gridSize
      )
      this.interactableContainer.addChild(interactable)
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
    this.player.zIndex = 10
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
    this.interactableContainer?.children.forEach(interactable => {
      if (interactable.config.playersCanUse && this.player) this.checkAndHandleInteractableCollision(this.player, interactable)
      if (interactable.config.enemiesCanUse) {
        this.getEnemies().forEach(enemy => this.checkAndHandleInteractableCollision(enemy, interactable))
      }
    })
  }

  checkAndHandleInteractableCollision(sprite, interactable) {
    if (sprite.isTouching(interactable)) {
      interactable.onCollision(sprite, this)
      if (interactable.config.removeOnCollision) {
        this.interactableContainer.removeChild(interactable)
        interactable.destroy()
      }
    }
  }

  centerViewOnPlayer(screenCenter) {
    this.x = screenCenter.x
    this.y = screenCenter.y
    this.pivot.x = this.player.x
    this.pivot.y = this.player.y
  }

  dropRandomCurrency(min, max) {
    // todo: should drop on ground / need to be hoovered up
    // temp code
    // give a random amount of currency between 1 and 50
    const amount = Math.floor(Math.random() * (max - min + 1)) + min
    this.player.pickupCurrency(amount)
  }

  dropRandomItem(x, y) {
    if ($items?.length > 0) {
      // get a random item from $items array
      const itemTemplate = $items[Math.floor(Math.random() * $items.length)]
      const art = $art.find(a => a.id === itemTemplate.graphics.still)
      const item = {
        id: itemTemplate.id,
        stats: {
          ...itemTemplate.stats,
        },
      }

      // add it to our item container on ground at current location
      // const sprite = makeArtSprite(art)
      // sprite.x = x
      // sprite.y = y

      // // when player clicks the item, pick it up
      // sprite.interactive = true
      // sprite.anchor.set(0.5)
      // // sprite.scale.x = 0.5
      // // sprite.scale.y = 0.5
      // sprite.on('pointerdown', () => {
      //   this.player.pickupItem(item)
      //   this.itemContainer.removeChild(sprite)
      //   sprite.destroy()
      // })
      // this.itemContainer.addChild(sprite)

      this.player.pickupItem(item)
    }
  }
}
