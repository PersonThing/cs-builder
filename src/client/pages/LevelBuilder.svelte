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
        {#each $characters as c}
          <button type="button" class="btn {!$isDrawing && $testingWithId == c.id ? 'btn-success' : ''}" on:click={() => playTest(c)}>
            Test with {c.name}
          </button>
        {/each}
        <button type="button" class="btn {$isDrawing ? 'btn-success' : ''}" on:click={() => ($isDrawing = true)}>Edit</button>
      </div>
      {#if $isDrawing}
        <LevelRenderer
          level={input}
          playable={false}
          character={spawnPreviewTestCharacter}
          {gridSize}
          bind:this={levelRenderer}
          on:pointerdown={onDrawPointerDown}
          on:pointerup={onDrawPointerUp}
          on:pointermove={onDrawPointerMove}
        />
      {:else if character != null}
        <LevelRenderer level={input} {character} playable {gridSize} bind:this={levelRenderer} />
      {:else}
        <p>Cannot play test until you have at least 1 character created.</p>
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
          <div class="draw-option" class:selected={drawMode == DrawMode.Spawn} on:click={() => setDrawMode(DrawMode.Spawn)}>
            <div class="form-group">
              <div class="strong">Set spawn point</div>
            </div>
          </div>

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

          <div class="draw-option" class:selected={drawMode == DrawMode.Interactables} on:click={() => setDrawMode(DrawMode.Interactables)}>
            <div class="form-group">
              <div class="strong">Place an interactable</div>
              <InputSelect bind:value={selectedInteractableId} options={interactableOptions} let:option>
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
    interactables: [],
    enemies: [],
    spawn: {
      x: 0,
      y: 0,
    },
  }

  function getItemGraphic(item) {
    return $characterclasses.length ? $characterclasses[0].graphics.still : null
  }

  //////////// things unique to level builder ////////////
  import { tiles, enemies, interactables, characters, characterclasses, levels } from '../stores/project-stores'
  import { sortByName } from '../services/object-utils'
  import ArtThumb from '../components/ArtThumb.svelte'
  import ColorPicker from '../components/ColorPicker.svelte'
  import FieldCheckbox from '../components/FieldCheckbox.svelte'
  import FieldText from '../components/FieldText.svelte'
  import InputSelect from '../components/InputSelect.svelte'
  import LevelRenderer from '../components/LevelRenderer.svelte'
  import LocalStorageStore from '../stores/local-storage-store'
  import { tick } from 'svelte'

  const gridSize = 40
  const DrawMode = {
    Tiles: 0,
    Interactables: 1,
    Enemies: 2,
    Spawn: 3,
  }

  let isDrawing = LocalStorageStore('is-drawing', false)
  let testingWithId = LocalStorageStore('testing-with', null)
  let levelRenderer
  let selectedTileId = 0
  let selectedInteractableId = null
  let selectedEnemyId = null
  let drawMode = DrawMode.Tiles
  let pointerIsDown = false

  async function playTest(c) {
    // force it to re-render if switching between characters when you were already play-testing
    $isDrawing = true
    await tick()

    $testingWithId = c.id
    $isDrawing = false
  }

  $: character = $testingWithId != null ? $characters.find(c => c.id == $testingWithId) : null
  $: spawnPreviewTestCharacter = $characters.length > 0 ? $characters[0] : null

  $: tileOptions = [
    { value: null, name: 'Erase tiles' },
    ...$tiles
      .map(t => ({
        ...t,
        value: t.id,
      }))
      .sort(sortByName),
  ]

  $: interactableOptions = [
    { value: null, name: 'Erase interactables' },
    ...$interactables
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
        case DrawMode.Interactables:
          selectedInteractableId = input.interactables.find(i => i.x == x && i.y == y)?.id
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
        levelRenderer.getWorld().redrawTiles()
        break
      case DrawMode.Interactables:
        input.interactables = replaceAtCoord(input.interactables, x, y, selectedInteractableId)
        levelRenderer.getWorld().redrawInteractables()
        break
      case DrawMode.Enemies:
        input.enemies = replaceAtCoord(input.enemies, x, y, selectedEnemyId)
        levelRenderer.getWorld().redrawEnemies()
        break
      case DrawMode.Spawn:
        input.spawn = { x, y }
        levelRenderer.movePlayerToGridPoint(input.spawn)
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
    position: absolute;
    top: 0;
    right: 0;
    padding: 5px;
  }
</style>
