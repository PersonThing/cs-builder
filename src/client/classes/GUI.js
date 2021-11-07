import * as PIXI from 'pixi.js'
import emptyContainer from '../services/empty-container.js'
import makeArtSprite from '../services/make-art-sprite.js'
import { project, items, art } from '../stores/project-stores.js'
let $project, $items, $art
project.subscribe(v => ($project = v))
items.subscribe(v => ($items = v))
art.subscribe(v => ($art = v))

export default class GUI extends PIXI.Container {
  constructor(player, rendererWidth, rendererHeight) {
    super()
    this.player = player
    this.player.addItemPickupListener(() => this.redrawItems())
    this.player.addCurrencyPickupListener(() => this.redrawCurrencyText())
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
    if (this.inventoryPanel.visible) {
      this.hideInventoryPanel()
    } else {
      this.showInventoryPanel()
    }
  }

  showInventoryPanel() {
    this.redrawItems()
    this.redrawCurrencyText()
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
    this.gridSpacing = gridSquareSize + gridPadding
    this.gridRows = 5
    this.gridCols = 10
    this.gridX = (panelWidth - this.gridSpacing * this.gridCols) / 2
    this.gridY = panelHeight - this.gridSpacing * this.gridRows - 30

    // draw inventory grid
    const drawItemSlot = (g, x, y, size) => {
      g.beginFill(0x000000, 0.5)
      g.lineStyle(2, 0x000000, 0.5)
      g.drawRect(x, y, size, size)
    }

    for (let x = 0; x < this.gridCols; x++) {
      for (let y = 0; y < this.gridRows; y++) {
        drawItemSlot(graphics, this.gridX + x * this.gridSpacing, this.gridY + y * this.gridSpacing, gridSquareSize)
      }
    }

    // draw equipped item slots
    const equippedSlots = new PIXI.Container()
    const equippedSlotsGraphics = new PIXI.Graphics()
    equippedSlots.addChild(equippedSlotsGraphics)
    this.inventoryPanel.addChild(equippedSlots)
    const equippedSlotSize = this.gridSpacing * 1.5 + 20
    const slots = [
      {
        slot: 'Head',
        x: equippedSlotSize,
        y: 0,
      },
      {
        slot: 'Chest',
        x: equippedSlotSize,
        y: equippedSlotSize,
      },
      {
        slot: 'Legs',
        x: equippedSlotSize,
        y: equippedSlotSize * 2,
      },
      {
        slot: 'Feet',
        x: equippedSlotSize * 2,
        y: equippedSlotSize * 2,
      },
      {
        slot: 'Hands',
        x: 0,
        y: equippedSlotSize * 2,
      },
      {
        slot: 'Mainhand',
        x: 0,
        y: equippedSlotSize,
      },
      {
        slot: 'Offhand',
        x: equippedSlotSize * 2,
        y: equippedSlotSize,
      },
      {
        slot: 'Accessory 1',
        x: 0,
        y: equippedSlotSize * 4,
      },
      {
        slot: 'Accessory 2',
        x: equippedSlotSize,
        y: equippedSlotSize * 4,
      },
      {
        slot: 'Accessory 3',
        x: equippedSlotSize * 2,
        y: equippedSlotSize * 4,
      },
    ]
    slots.forEach(slot => {
      const text = new PIXI.Text(slot.slot, { fontFamily: 'Arial', fontSize: 14, fill: 0x000000 })
      text.x = slot.x + (gridSquareSize * 1.5) / 2 - text.width / 2
      text.y = slot.y - text.height
      equippedSlots.addChild(text)
      drawItemSlot(equippedSlotsGraphics, slot.x, slot.y, gridSquareSize * 1.5)
    })
    equippedSlots.x = panelWidth / 2 - equippedSlots.width / 2
    equippedSlots.y = this.gridY - 600

    // currency
    this.redrawCurrencyText()

    // containers for item sprites
    this.itemSprites = new PIXI.Container()
    this.inventoryPanel.addChild(this.itemSprites)

    this.redrawItems()
    this.hideInventoryPanel()
  }

  redrawCurrencyText() {
    if (this.currencyText) {
      this.inventoryPanel.removeChild(this.currencyText)
      this.currencyText.destroy()
    }
    this.currencyText = new PIXI.Text(`${$project?.currency}: ${this.player.character.currency}`, {
      fontFamily: 'Arial',
      fontSize: 20,
      fill: 0x000000,
    })
    this.currencyText.x = this.gridX
    this.currencyText.y = this.gridY - this.currencyText.height - 5
    this.currencyText.zIndex = 11
    this.inventoryPanel.addChild(this.currencyText)
  }

  redrawItems() {
    emptyContainer(this.itemSprites)

    this.player.character.inventory.forEach((item, i) => {
      const itemTemplate = $items.find(i => i.id === item.id)
      const art = $art.find(a => a.id === itemTemplate.graphics.still)
      const itemSprite = makeArtSprite(art)
      // put it somewhere in the grid...
      itemSprite.x = this.gridX + (i % this.gridCols) * this.gridSpacing + 5
      itemSprite.y = this.gridY + Math.floor(i / this.gridCols) * this.gridSpacing + 5
      itemSprite.zIndex = 11
      itemSprite.interactive = true
      itemSprite.buttonMode = true
      itemSprite.on('pointerdown', event => {
        // temp code for now..
        // if left click, equip it
        if (event.data.isPrimary) {
          this.player.equipItem(i)
        } else {
          this.player.dropItem(i)
        }
        this.redrawItems()
      })
      this.itemSprites.addChild(itemSprite)
    })
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
