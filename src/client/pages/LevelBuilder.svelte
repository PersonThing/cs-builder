<ItemTypeBuilder
  id={params.id}
  itemType="levels"
  singular="level"
  itemTypeDescription="Create and test levels here."
  store={levels}
  {itemTemplate}
  bind:input
  bind:this={itemTypeBuilder}
  {getItemGraphic}
  showButtons={false}
  let:isAdding
  let:hasChanges
  on:edit={forceRender}
>
  {#if input}
    <div class="grow">
      <div class="btn-group play-edit-toggle">
        <button type="button" class="btn {!$isDrawing ? 'btn-success' : ''}" on:click={() => ($isDrawing = false)}>Play test</button>
        <button type="button" class="btn {$isDrawing ? 'btn-success' : ''}" on:click={() => ($isDrawing = true)}>Edit</button>
      </div>
      {#if $isDrawing}
        <LevelRenderer
          level={input}
          playable={false}
          {gridSize}
          bind:this={levelRenderer}
          on:pointerdown={onDrawPointerDown}
          on:pointerup={onDrawPointerUp}
          on:pointermove={onDrawPointerMove}
        />
      {:else}
        <LevelRenderer level={input} playable {gridSize} bind:this={levelRenderer} />
      {/if}
    </div>

    <div class="col2 p10">
      <Form on:submit={() => itemTypeBuilder.save()}>
        <FormButtons {hasChanges} canDelete={!isAdding} on:delete={() => itemTypeBuilder.del()} />
        <FieldText name="name" bind:value={input.name} placeholder="Type a name...">Name</FieldText>
        <div class="form-group">
          <div class="strong">Background color</div>
          <ColorPicker bind:value={input.backgroundColor} dropdownClass="below right" />
        </div>
        <FieldCheckbox bind:checked={input.smoothPathing} name="smooth-pathing" on:change={forceRender}>Smooth pathing</FieldCheckbox>
        <FieldCheckbox bind:checked={input.showPaths} name="show-paths" on:change={forceRender}>Show paths</FieldCheckbox>
        <FieldCheckbox bind:checked={input.showSightRadius} name="show-sight-radius" on:change={forceRender}>Show sight radius</FieldCheckbox>
      </Form>

      {#if $isDrawing}
        <div class="flex-column">
          <div class="draw-option" class:selected={drawMode == DrawMode.Tiles} on:click={() => setDrawMode(DrawMode.Tiles)}>
            <div class="form-group">
              <div class="strong">Place a tile</div>
              <InputSelect bind:value={selectedTileId} options={tileOptions} let:option>
                {#if option.graphic != null}
                  <ArtThumb id={option.graphic} />
                {/if}
                {option.name}
              </InputSelect>
            </div>
          </div>

          <div class="draw-option" class:selected={drawMode == DrawMode.Items} on:click={() => setDrawMode(DrawMode.Items)}>
            <div class="form-group">
              <div class="strong">Place an item</div>
              <InputSelect bind:value={selectedItemId} options={itemOptions} let:option>
                {#if option.graphics?.still != null}
                  <ArtThumb id={option.graphics.still} />
                {/if}
                {option.name}
              </InputSelect>
            </div>
          </div>

          <div class="draw-option" class:selected={drawMode == DrawMode.Enemies} on:click={() => setDrawMode(DrawMode.Enemies)}>
            <div class="form-group">
              <div class="strong">Place an enemy</div>
              <InputSelect bind:value={selectedEnemyId} options={enemyOptions} let:option>
                {#if option.graphics?.still != null}
                  <ArtThumb id={option.graphics.still} />
                {/if}
                {option.name}
              </InputSelect>
            </div>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</ItemTypeBuilder>

<script>
  //////////// common ItemTypeBuilder stuff ////////////
  import ItemTypeBuilder from '../components/ItemTypeBuilder.svelte'
  import Form from '../components/Form.svelte'
  import FormButtons from '../components/FormButtons.svelte'

  export let params = {}
  let input = null
  let itemTypeBuilder

  const itemTemplate = {
    name: '',
    backgroundColor: 'rgba(0,0,0,1)',
    smoothPathing: false,
    showPaths: true,
    showSightRadius: true,
    tiles: [],
    items: [],
    enemies: [],
  }

  function getItemGraphic(item) {
    return $characters.length ? $characters[0].graphics.still : null
  }

  //////////// things unique to level builder ////////////
  import { tiles, enemies, items, characters, levels } from '../stores/project-stores'
  import { sortByName } from '../services/object-utils'
  import ArtThumb from '../components/ArtThumb.svelte'
  import ColorPicker from '../components/ColorPicker.svelte'
  import FieldCheckbox from '../components/FieldCheckbox.svelte'
  import FieldText from '../components/FieldText.svelte'
  import InputSelect from '../components/InputSelect.svelte'
  import LevelRenderer from '../components/LevelRenderer.svelte'
  import LocalStorageStore from '../stores/local-storage-store'

  const gridSize = 40
  const DrawMode = {
    Tiles: 0,
    Items: 1,
    Enemies: 2,
  }

  let isDrawing = LocalStorageStore('is-drawing', false)
  let levelRenderer
  let selectedTileId = 0
  let selectedItemId = null
  let selectedEnemyId = null
  let drawMode = DrawMode.Tiles
  let pointerIsDown = false

  $: tileOptions = [
    { value: null, name: 'Erase tiles' },
    ...$tiles
      .map(t => ({
        ...t,
        value: t.id,
      }))
      .sort(sortByName),
  ]

  $: itemOptions = [
    { value: null, name: 'Erase items' },
    ...$items
      .map(i => ({
        ...i,
        value: i.id,
      }))
      .sort(sortByName),
  ]

  $: enemyOptions = [
    { value: null, name: 'Erase enemies' },
    ...$enemies
      .map(i => ({
        ...i,
        value: i.id,
      }))
      .sort(sortByName),
  ]

  function forceRender() {
    levelRenderer?.restartPixi()
  }

  function onDrawPointerDown(event) {
    pointerIsDown = true
    // if they do anything but left click, select the tile at the current position (or eraser if null)
    if (event.detail.button != 0) {
      const { x, y } = getGridCoordsFromEvent(event)
      switch (drawMode) {
        case DrawMode.Tiles:
          selectedTileId = input.tiles.find(t => t.x == x && t.y == y)?.id
          break
        case DrawMode.Items:
          selectedItemId = input.items.find(i => i.x == x && i.y == y)?.id
          break
        case DrawMode.Enemies:
          selectedEnemyId = input.enemies.find(i => i.x == x && i.y == y)?.id
          break
      }
    } else {
      drawAtEvent(event)
    }
  }

  function onDrawPointerMove(event) {
    if (!pointerIsDown) return
    drawAtEvent(event)
  }

  function onDrawPointerUp(event) {
    pointerIsDown = false
  }

  function getGridCoordsFromEvent(event) {
    return {
      x: Math.floor(event.detail.offsetX / gridSize),
      y: Math.floor(event.detail.offsetY / gridSize),
    }
  }

  function drawAtEvent(event) {
    const { x, y } = getGridCoordsFromEvent(event)
    switch (drawMode) {
      case DrawMode.Tiles:
        input.tiles = replaceAtCoord(input.tiles, x, y, selectedTileId)
        levelRenderer.redrawTiles()
        break
      case DrawMode.Items:
        input.items = replaceAtCoord(input.items, x, y, selectedItemId)
        levelRenderer.redrawItems()
        break
      case DrawMode.Enemies:
        input.enemies = replaceAtCoord(input.enemies, x, y, selectedEnemyId)
        levelRenderer.redrawEnemies()
        break
    }
  }

  function replaceAtCoord(objects, x, y, id) {
    const objectsMinusAnyAtThisXY = objects
      // filter out tiles at THIS spot
      .filter(o => o.x != x || o.y != y)
      // also filter tiles that are in negative space (messes with grid path helper)
      .filter(b => b.x >= 0 && b.y >= 0)
    if (id == null) {
      objects = objectsMinusAnyAtThisXY
    } else {
      const newObject = { x, y, id }
      objects = [...objectsMinusAnyAtThisXY, newObject].sort((a, b) => (a.x == b.x ? a.y - b.y : a.x - b.x))
    }
    return objects
  }

  function setDrawMode(dm) {
    drawMode = dm
  }
</script>

<style lang="scss">
  .draw-option {
    border: 2px solid transparent;
    border-radius: 5px;
    margin-bottom: 10px;
    padding: 5px 5px 5px 35px;
    cursor: pointer;
    position: relative;

    &.selected {
      border-color: rgb(0, 119, 255);
      background: rgba(0, 119, 200, 0.1);

      &::after {
        content: '';
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        left: 13px;
        border: 8px solid transparent;
        border-left-color: rgb(0, 119, 255);
      }
    }

    .form-group {
      margin-bottom: 0;
    }
  }

  .play-edit-toggle {
    background: rgba(255, 255, 255, 0.3);
    position: absolute;
    top: 0;
    right: 0;
    padding: 5px;
  }
</style>
