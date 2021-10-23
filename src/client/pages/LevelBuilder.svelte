<AppLayout active="levels">
  <div class="col1">
    <ItemListNav slug="levels" type="level" collection={$levels} active={paramId} let:item>
      <div class="level-nav-item" style="background-image:url({item.thumbnail})">
        {item.name}
      </div>
    </ItemListNav>
  </div>

  {#if input}
    <div class="grow" style="position: relative;">
      <LevelRenderer
        level={input}
        playable={!isDrawing}
        {screenTarget}
        {gridSize}
        on:pointerdown={onPointerDown}
        on:pointerup={onPointerUp}
        on:pointermove={onPointerMove}
      />
    </div>

    <div class="col2 rows">
      <div class="btn-group">
        <button type="button" class="btn {!isDrawing ? 'btn-success' : ''}" on:click={() => (isDrawing = false)}>Play</button>
        <button type="button" class="btn {isDrawing ? 'btn-success' : ''}" on:click={() => (isDrawing = true)}>Edit</button>
      </div>

      <div class="grow">
        <Form on:submit={save} {hasChanges}>
          <span slot="buttons">
            {#if !isAdding}
              <button type="button" class="btn btn-danger" on:click={del}>Delete</button>
            {/if}
          </span>

          <FieldText name="name" bind:value={input.name} placeholder="Type a name...">Name</FieldText>
          <div class="form-group">
            <label>Background color</label>
            <ColorPicker bind:value={input.backgroundColor} dropdownClass="below right" />
          </div>

          <FieldCheckbox bind:checked={input.smoothPathing} name="smooth-pathing">Smooth pathing</FieldCheckbox>
          <FieldCheckbox bind:checked={input.showPaths} name="show-paths">Show paths</FieldCheckbox>

          <div class="form-group">
            <label>Place a block</label>
            <InputSelect bind:value={selectedBlockId} options={blockOptions} let:option on:change={() => setDrawMode(DrawMode.Blocks)}>
              {#if option.graphic != null}
                <ArtThumb id={option.graphic} />
              {/if}
              {option.name}
            </InputSelect>
          </div>

          <div class="form-group">
            <label>Place an item</label>
            <InputSelect bind:value={selectedItemId} options={itemOptions} let:option on:change={() => setDrawMode(DrawMode.Items)}>
              {#if option.graphics?.still != null}
                <ArtThumb id={option.graphics.still} />
              {/if}
              {option.name}
            </InputSelect>
          </div>

          <div class="form-group">
            <label>Place an enemy</label>
            <InputSelect bind:value={selectedEnemyId} options={enemyOptions} let:option on:change={() => setDrawMode(DrawMode.Enemies)}>
              {#if option.graphics?.still != null}
                <ArtThumb id={option.graphics.still} />
              {/if}
              {option.name}
            </InputSelect>
          </div>
        </Form>
      </div>
      <!-- <div class="grow">Properties of selected item, if any</div> -->
    </div>
  {/if}
</AppLayout>

<script>
  import { push } from 'svelte-spa-router'
  import { sortByName } from '../services/object-utils'
  import { tick } from 'svelte'
  import AppLayout from '../components/AppLayout.svelte'
  import ArtThumb from '../components/ArtThumb.svelte'
  import ColorPicker from '../components/ColorPicker.svelte'
  import FieldText from '../components/FieldText.svelte'
  import Form from '../components/Form.svelte'
  import InputSelect from '../components/InputSelect.svelte'
  import ItemListNav from '../components/ItemListNav.svelte'
  import LevelRenderer from './LevelBuilder.Renderer.svelte'
  import { project, blocks, enemies, items, levels } from '../stores/project-stores'
  import validator from '../services/validator'
  import FieldCheckbox from '../components/FieldCheckbox.svelte'

  export let params = {}
  let input = createDefaultInput()

  let isDrawing = true
  let screenTarget = { x: 0, y: 0 }

  const gridSize = 40

  $: paramId = decodeURIComponent(params.id) || 'new'
  $: if (paramId == 'new' || paramId == null || $levels != null) {
    paramId == 'new' || paramId == null ? create() : edit(paramId)
  }
  $: isAdding = input?.id == null
  $: hasChanges =
    input != null &&
    !validator.equals(
      input,
      $levels.find(l => l.id == input.id)
    )

  let selectedBlockId = 0
  let selectedItemId = null
  let selectedEnemyId = null

  const DrawMode = {
    Blocks: 0,
    Items: 1,
    Enemies: 2,
  }
  let drawMode = DrawMode.Blocks

  $: blockOptions = [
    { value: null, name: 'None' },
    ...$blocks
      .map(b => ({
        ...b,
        value: b.id,
      }))
      .sort(sortByName),
  ]

  $: itemOptions = [
    { value: null, name: 'None' },
    ...$items
      .map(i => ({
        ...i,
        value: i.id,
      }))
      .sort(sortByName),
  ]

  $: enemyOptions = [
    { value: null, name: 'None' },
    ...$enemies
      .map(i => ({
        ...i,
        value: i.id,
      }))
      .sort(sortByName),
  ]

  function create() {
    input = createDefaultInput()
  }

  function createDefaultInput() {
    return {
      projectId: $project.id,
      name: '',
      backgroundColor: 'rgba(0,0,0,1)',
      smoothPathing: false,
      showPaths: true,
      blocks: [],
      items: [],
      enemies: [],
    }
  }

  async function edit(id) {
    const level = $levels.find(l => l.id == id)
    if (level == null) return
    input = null
    await tick()
    input = {
      ...createDefaultInput(),
      ...JSON.parse(JSON.stringify(level)),
    }
  }

  function save() {
    if (validator.empty(input.name)) {
      document.getElementById('name').focus()
      return
    }
    ;(isAdding
      ? levels.apiInsert(input).then(item => {
          input = item
        })
      : levels.apiUpdate(input)
    ).then(() => {
      push(`/levels/${encodeURIComponent(input.id)}`)
    })
  }

  function del() {
    if (confirm(`Are you sure you want to delete "${input.name}"?`)) {
      levels.apiDelete(input.projectId, input.id)
      push(`/levels/new`)
    }
  }

  let pointerIsDown = false
  function onPointerDown(event) {
    pointerIsDown = true

    if (isDrawing) {
      // if they do anything but left click, select the block at the current position (or eraser if null)
      if (event.button != 0) {
        const { x, y } = getBlockCoordsFromEvent(event)
        selectedBlockId = input.blocks.find(b => b.x == x && b.y == y)?.id
        selectedItemId = input.items.find(i => i.x == x && i.y == y)?.id
        selectedEnemyId = input.enemies.find(i => i.x == x && i.y == y)?.id

        setDrawMode(selectedEnemyId != null ? DrawMode.Enemies : selectedItemId != null ? DrawMode.Items : DrawMode.Blocks)
      } else {
        drawAtEvent(event)
      }
    } else {
      movePlayerToEvent(event)
    }
  }

  function onPointerUp(event) {
    pointerIsDown = false
  }

  function onPointerMove(event) {
    if (!pointerIsDown) return

    if (isDrawing) {
      drawAtEvent(event)
    } else {
      movePlayerToEvent(event)
    }
  }

  function getBlockCoordsFromEvent(event) {
    return {
      x: Math.floor(event.offsetX / gridSize),
      y: Math.floor(event.offsetY / gridSize),
    }
  }

  function drawAtEvent(event) {
    const { x, y } = getBlockCoordsFromEvent(event)
    switch (drawMode) {
      case DrawMode.Blocks:
        input.blocks = replaceAtCoord(input.blocks, x, y, selectedBlockId)
        break
      case DrawMode.Items:
        input.items = replaceAtCoord(input.items, x, y, selectedItemId)
        break
      case DrawMode.Enemies:
        input.enemies = replaceAtCoord(input.enemies, x, y, selectedEnemyId)
    }
  }

  function replaceAtCoord(objects, x, y, id) {
    const objectsMinusAnyAtThisXY = objects.filter(o => o.x != x || o.y != y)
    if (id == null) {
      objects = objectsMinusAnyAtThisXY
    } else {
      const newObject = { x, y, id }
      objects = [...objectsMinusAnyAtThisXY, newObject].sort((a, b) => (a.x == b.x ? a.y - b.y : a.x - b.x))
    }
    return objects
  }

  function movePlayerToEvent(event) {
    screenTarget = {
      x: event.offsetX,
      y: event.offsetY,
    }
  }

  function setDrawMode(dm) {
    drawMode = dm
    switch (dm) {
      case DrawMode.Blocks:
        selectedItemId = null
        selectedEnemyId = null
        break
      case DrawMode.Items:
        selectedBlockId = null
        selectedEnemyId = null
        break
      case DrawMode.Enemies:
        selectedBlockId = null
        selectedItemId = null
        break
    }
  }
</script>

<style lang="scss">
  .level-nav-item {
    height: 60px;
    width: 100%;
    background-size: contain;
    background-position: 10px 20px;
    background-repeat: no-repeat;
  }
</style>