import * as PIXI from 'pixi.js'
import makeArtSprite from '../services/make-art-sprite.js'
import { project } from '../stores/project-stores.js'
let $project
project.subscribe(p => ($project = p))

export default class GUI extends PIXI.Container {
  constructor(player, rendererWidth, rendererHeight) {
    super()
    this.player = player
    this.rendererWidth = rendererWidth
    this.rendererHeight = rendererHeight
    this.sortableChildren = true

    this.drawCharacterPanel()
    this.drawInventoryPanel()
    this.drawAbilityBar()
  }

  toggleCharacterPanel() {
    this.characterPanel.visible = !this.characterPanel.visible
  }

  showCharacterPanel() {
    this.characterPanel.visible = true
  }

  hideCharacterPanel() {
    this.characterPanel.visible = false
  }

  toggleInventoryPanel() {
    this.inventoryPanel.visible = !this.inventoryPanel.visible
  }

  showInventoryPanel() {
    this.inventoryPanel.visible = true
  }

  hideInventoryPanel() {
    this.inventoryPanel.visible = false
  }

  drawCharacterPanel() {
    this.characterPanel = new PIXI.Container()
    this.characterPanel.zIndex = 10
    this.addChild(this.characterPanel)

    const graphics = new PIXI.Graphics()
    this.characterPanel.addChild(graphics)
    this.characterPanel.x = 10
    this.characterPanel.y = 10

    const panelWidth = this.rendererWidth / 2 - 15
    const panelHeight = this.rendererHeight - 20
    const panelPadding = 10

    // panel background
    graphics.beginFill(0xffffff, 0.8)
    graphics.lineStyle(2, 0x000000, 1.0)
    graphics.drawRect(0, 0, panelWidth, panelHeight)

    // character name
    const nameText = new PIXI.Text(`${this.player.character.name}`, { fontFamily: 'Arial', fontSize: 30, fill: 0x000000 })
    nameText.x = panelWidth - panelPadding - nameText.width
    nameText.y = panelPadding
    nameText.zIndex = 11
    this.characterPanel.addChild(nameText)

    // level + class
    const levelClassText = new PIXI.Text(`Level ${this.player.character.level} ${this.player.config.name}`, {
      fontFamily: 'Arial',
      fontSize: 30,
      fill: 0x000000,
    })
    levelClassText.x = panelPadding
    levelClassText.y = panelPadding
    levelClassText.zIndex = 11
    this.characterPanel.addChild(levelClassText)

    // health
    const healthText = new PIXI.Text(`Health: ${this.player.maxHealth}`, { fontFamily: 'Arial', fontSize: 20, fill: 0x000000 })
    healthText.x = panelPadding
    healthText.y = panelPadding + nameText.height + panelPadding
    healthText.zIndex = 11
    this.characterPanel.addChild(healthText)

    // power
    const powerText = new PIXI.Text(`Power: ${this.player.maxPower}`, { fontFamily: 'Arial', fontSize: 20, fill: 0x000000 })
    powerText.x = panelPadding
    powerText.y = panelPadding + nameText.height + panelPadding + healthText.height + panelPadding
    powerText.zIndex = 11
    this.characterPanel.addChild(powerText)

    // xp
    const xpText = new PIXI.Text(`XP: ${this.player.character.xp}`, { fontFamily: 'Arial', fontSize: 20, fill: 0x000000 })
    xpText.x = panelPadding
    xpText.y = panelPadding + nameText.height + panelPadding + healthText.height + panelPadding + powerText.height + panelPadding
    xpText.zIndex = 11
    this.characterPanel.addChild(xpText)

    this.hideCharacterPanel()
  }

  drawInventoryPanel() {
    this.inventoryPanel = new PIXI.Container()
    this.inventoryPanel.zIndex = 10
    this.addChild(this.inventoryPanel)
    const graphics = new PIXI.Graphics()
    this.inventoryPanel.x = this.rendererWidth / 2 + 5
    this.inventoryPanel.y = 10
    this.inventoryPanel.addChild(graphics)

    const panelWidth = this.rendererWidth / 2 - 15
    const panelHeight = this.rendererHeight - 20

    // panel background
    graphics.beginFill(0xffffff, 0.8)
    graphics.lineStyle(2, 0x000000, 1.0)
    graphics.drawRect(0, 0, panelWidth, panelHeight)

    // inventory
    // sizing for inventory grid
    const gridSquareSize = 50 //rendererWidth / 2 / 10
    const gridPadding = 3
    const gridSpacing = gridSquareSize + gridPadding
    const rows = 5
    const cols = 10
    const gridX = (panelWidth - gridSpacing * cols) / 2
    const gridY = panelHeight - gridSpacing * rows - 30

    // draw inventory grid
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        graphics.beginFill(0x000000, 0.5)
        graphics.lineStyle(2, 0x000000, 0.5)
        graphics.drawRect(gridX + i * gridSpacing, gridY + j * gridSpacing, gridSquareSize, gridSquareSize)
      }
    }

    // container for item graphics in the grid squares
    this.inventoryItems = new PIXI.Container()
    this.inventoryPanel.addChild(this.inventoryItems)
    this.player.inventory.forEach(inventorySlot => {
      const item = inventorySlot.item
      if (item) {
        const itemGraphic = makeArtSprite(item.graphic)
        itemGraphic.x = gridX + inventorySlot.x * gridSpacing + gridSquareSize / 2
        itemGraphic.y = gridY + inventorySlot.y * gridSpacing + gridSquareSize / 2
        itemGraphic.anchor.set(0.5)
        this.inventoryItems.addChild(itemGraphic)
      }
    })

    // currency
    const currencyText = new PIXI.Text(`${$project?.currency}: ${this.player.gold}`, { fontFamily: 'Arial', fontSize: 20, fill: 0x000000 })
    currencyText.x = gridX
    currencyText.y = gridY - currencyText.height - 5
    currencyText.zIndex = 11
    this.inventoryPanel.addChild(currencyText)

    this.hideInventoryPanel()
  }

  drawAbilityBar() {
    const buttonWidth = 45
    const buttonHeight = 45
    const buttonPadding = 10

    this.abilityBar = new PIXI.Container()
    this.inventoryPanel.zIndex = 5
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
    this.hideInventoryPanel()
    this.hideCharacterPanel()

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
    this.characterPanel.destroy()
    this.removeChild(this.characterPanel)

    this.inventoryPanel.destroy()
    this.removeChild(this.inventoryPanel)

    this.abilityBar.destroy()
    this.removeChild(this.abilityBar)
    super.destroy()
  }
}
