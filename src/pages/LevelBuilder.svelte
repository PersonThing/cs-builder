<AppLayout active="levels">
  <div class="col1">
    <ItemListNav slug="levels" type="level" collection={$project.levels} active={paramId} let:item>
      <div class="level-nav-item" style="background-image:url({item.thumbnail})">
        {item.name}
      </div>
    </ItemListNav>
  </div>

  {#if input}
    <div class="grow">
      <LevelRenderer level={input} {screenTarget} on:pointerdown={onPointerDown} on:pointerup={onPointerUp} on:pointermove={onPointerMove} />
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

          <div class="form-group">
            <label>Block to draw</label>
            <InputSelect bind:value={selectedBlockId} options={blockOptions} let:option>
              {#if option.graphic != null}
                <ArtThumb id={option.graphic} />
              {/if}
              {option.name}
            </InputSelect>
          </div>
        </Form>
      </div>
      <div class="grow">Properties of selected item, if any</div>
    </div>
  {/if}
</AppLayout>

<script>
  import { getNextId } from '../stores/project-store'
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
  import project from '../stores/active-project-store'
  import validator from '../services/validator'

  export let params = {}
  let input = createDefaultInput()

  let isDrawing = false
  let screenTarget = { x: 0, y: 0 }

  $: paramId = decodeURIComponent(params.id) || 'new'
  $: paramId == 'new' ? create() : edit(paramId)
  $: isAdding = input?.id == null
  $: hasChanges = input != null && !validator.equals(input, $project.levels[input.id])

  function createDefaultInput() {
    return {
      name: '',
      backgroundColor: 'rgba(0,0,0,1)',
      blocks: [],
      enemies: [],
    }
  }

  let selectedBlockId = 0
  $: blockOptions = [
    { value: null, name: 'Eraser' },
    ...Object.values($project.blocks)
      .map(b => ({
        ...b,
        value: b.id,
      }))
      .sort(sortByName),
  ]

  function create() {
    input = createDefaultInput()
  }

  async function edit(name) {
    if (!$project.levels.hasOwnProperty(name)) return
    input = null
    await tick()
    input = {
      ...createDefaultInput(),
      ...JSON.parse(JSON.stringify($project.levels[name])),
    }
  }

  function save() {
    if (validator.empty(input.name)) {
      document.getElementById('name').focus()
      return
    }
    if (isAdding) input.id = getNextId($project.levels)
    $project.levels[input.id] = JSON.parse(JSON.stringify(input))
    push(`/levels/${encodeURIComponent(input.id)}`)
  }

  function del() {
    if (confirm(`Are you sure you want to delete "${input.name}"?`)) {
      delete $project.levels[input.id]
      $project.levels = $project.levels
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
        selectedBlockId = input.blocks.find(b => b.x == x && b.y == y)?.blockId
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
      x: Math.floor(event.offsetX / 40),
      y: Math.floor(event.offsetY / 40),
    }
  }

  function drawAtEvent(event) {
    const { x, y } = getBlockCoordsFromEvent(event)
    const blocksMinusAnyAtThisXY = input.blocks.filter(b => b.x != x || b.y != y)
    if (selectedBlockId == null) {
      input.blocks = blocksMinusAnyAtThisXY
    } else {
      const newBlock = { x, y, blockId: selectedBlockId }
      input.blocks = [...blocksMinusAnyAtThisXY, newBlock]
    }
  }

  function movePlayerToEvent(event) {
    screenTarget = {
      x: event.offsetX,
      y: event.offsetY,
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
