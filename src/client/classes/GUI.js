import * as PIXI from 'pixi.js'
import makeArtSprite from '../services/make-art-sprite.js'

export default class GUI extends PIXI.Container {
  constructor(player, rendererWidth, rendererHeight) {
    super()
    this.player = player
    this.rendererWidth = rendererWidth
    this.rendererHeight = rendererHeight
    this.sortableChildren = true

    this.drawInventory()
    this.drawAbilityBar()
  }

  toggleInventory() {
    this.inventoryOpen = !this.inventoryOpen
    this.inventory.visible = this.inventoryOpen
  }

  showInventory() {
    this.inventoryOpen = false
    this.inventory.visible = false
  }

  hideInventory() {
    this.inventoryOpen = false
    this.inventory.visible = false
  }

  drawInventory() {
    this.inventory = new PIXI.Container()
    this.inventory.zIndex = 10
    this.addChild(this.inventory)

    const graphics = new PIXI.Graphics()
    this.inventory.addChild(graphics)

    // figure out sizing for inventory grid
    const gridSquareSize = 30 //rendererWidth / 2 / 10
    const gridPadding = 4
    const gridSpacing = gridSquareSize + gridPadding
    const rows = 10
    const cols = 15
    const yOffset = this.rendererHeight - gridSpacing * rows - 50
    const xOffset = gridPadding + 50
    const width = xOffset * 2 + gridSpacing * cols

    // background color to cover enough space for inventory
    graphics.beginFill(0x000000, 0.8)
    graphics.lineStyle(0x000000, 1.0)
    graphics.drawRect(0, 0, width, this.rendererHeight)

    // draw inventory grid
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        graphics.beginFill(0xffffff, 0.5)
        graphics.lineStyle(0x000000, 1.0)
        graphics.drawRect(xOffset + i * gridSpacing, yOffset + j * gridSpacing, gridSquareSize, gridSquareSize)
      }
    }

    // container for item graphics in the grid squares
    this.inventoryItems = new PIXI.Container()
    this.inventory.addChild(this.inventoryItems)

    this.player.inventory.forEach(inventorySlot => {
      const item = inventorySlot.item
      if (item) {
        const itemGraphic = makeArtSprite(item.graphic)
        itemGraphic.x = xOffset + inventorySlot.x * gridSpacing + gridSquareSize / 2
        itemGraphic.y = yOffset + inventorySlot.y * gridSpacing + gridSquareSize / 2
        itemGraphic.anchor.set(0.5)
        this.inventoryItems.addChild(itemGraphic)
      }
    })

    this.inventoryOpen = false
    this.inventory.visible = false
  }

  drawAbilityBar() {
    const buttonWidth = 45
    const buttonHeight = 45
    const buttonPadding = 10

    this.abilityBar = new PIXI.Container()
    this.inventory.zIndex = 5
    this.addChild(this.abilityBar)

    let x = 0
    this.player.abilities
      .map(a => a.config)
      .forEach((ability, i) => {
        const bg = new PIXI.Graphics()
        bg.x = x
        bg.y = 0
        bg.lineStyle(5, 0x000000)
        bg.beginFill(0x000000, 0.5)
        bg.drawRect(0, 0, buttonWidth, buttonHeight)
        this.abilityBar.addChild(bg)

        // art
        const art = ability.graphics.projectile ? ability.graphics.projectile : ability.characterArt ? ability.characterArt : null
        if (art) {
          const abilityArt = makeArtSprite(art) // new PIXI.Sprite(PIXI.Texture.from(art))
          abilityArt.x = x + buttonWidth / 2
          abilityArt.y = buttonHeight / 2
          abilityArt.anchor.set(0.5)
          this.abilityBar.addChild(abilityArt)
        }

        // key text
        if (ability.key) {
          const keyText = new PIXI.Text(ability.key.toUpperCase(), {
            fontFamily: 'consolas',
            fontSize: 24,
            strokeThickness: 5,
            stroke: 0x000000,
            fill: 0xffffff,
          })
          keyText.x = x + buttonWidth / 2 - keyText.width / 2
          keyText.y = -keyText.height
          this.abilityBar.addChild(keyText)
        }

        // ability name text
        // const nameText = new PIXI.Text(ability.name, {
        //   fontFamily: 'consolas',
        //   fontSize: 14,
        //   strokeThickness: 4,
        //   stroke: 0x000000,
        //   fill: 0xffffff,
        // })
        // nameText.x = x + buttonWidth / 2 - nameText.width / 2
        // nameText.y = buttonHeight + 5
        // this.abilityBar.addChild(nameText)

        x += buttonWidth + buttonPadding + buttonPadding
      })

    const totalButtonWidth = buttonWidth * this.player.abilities.length + buttonPadding * (this.player.abilities.length - 1)
    this.abilityBar.x = this.rendererWidth / 2 - totalButtonWidth / 2
    this.abilityBar.y = this.rendererHeight - this.abilityBar.height - 10
  }

  showDeathScreen() {
    this.hideInventory()

    const graphics = new PIXI.Graphics()
    graphics.beginFill(0x000000, 0.5)
    graphics.drawRect(0, 0, this.rendererWidth, this.rendererHeight)
    graphics.zIndex = 10

    this.addChild(graphics)
    const text = new PIXI.Text('Press enter to restart', { fontFamily: 'Arial', fontSize: 50, fill: 0xffffff })
    text.x = this.rendererWidth / 2 - text.width / 2
    text.y = this.rendererHeight / 2 - text.height / 2
    text.zIndex = 11
    this.addChild(text)
  }

  destroy() {
    this.inventory.destroy()
    this.removeChild(this.inventory)

    this.abilityBar.destroy()
    this.removeChild(this.abilityBar)
    super.destroy()
  }
}
