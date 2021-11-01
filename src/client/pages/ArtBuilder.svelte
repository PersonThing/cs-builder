<svelte:window on:keyup={onKeyUp} on:paste={onPaste} on:mouseup={onDrawPointerUp} />

<ItemTypeBuilder
  id={params.id}
  itemType="art"
  singular="art"
  itemTypeDescription="Use this page to create the art for your game. You can make simple graphics or animations."
  store={art}
  {itemTemplate}
  bind:input
  bind:this={itemTypeBuilder}
  {getItemGraphic}
  showButtons={false}
  let:isAdding
  let:hasChanges
  on:edit={redraw}
  on:create={redraw}
>
  {#if input}
    <div class="grow rows">
      <div class="grow columns">
        <div class="col1">
          <div class="art-actions">
            <button type="button" class="btn btn-light btn-sm mr1" on:click={reset}>Start over</button>

            <ColorPicker bind:value={selectedColor} on:change={() => (mode = mode == 'erase' ? 'paint' : mode)} dropdownClass="below left" />
            <div class="btn-group">
              <button
                type="button"
                class="btn btn-sm btn-{mode == 'paint' ? 'primary' : 'light'}"
                on:click={() => (mode = 'paint')}
                title="Paint brush"
              >
                <Icon data={paintIcon} />
              </button>
              <button
                type="button"
                class="btn btn-sm btn-{mode == 'fill' ? 'primary' : 'light'}"
                on:click={() => (mode = 'fill')}
                title="Paint bucket"
              >
                <Icon data={fillIcon} />
              </button>
              <button type="button" class="btn btn-sm btn-{mode == 'erase' ? 'primary' : 'light'}" on:click={() => (mode = 'erase')} title="Eraser">
                <Icon data={eraseIcon} />
              </button>
            </div>

            <div class="btn-group">
              <button type="button" disabled={undos.length == 0} class="btn btn-default btn-sm" on:click={undo}>
                <Icon data={undoIcon} />
                {undos.length > 0 ? undos.length : ''}
              </button>
              <button type="button" disabled={redos.length == 0} class="btn btn-default btn-sm" on:click={redo}>
                <Icon data={undoIcon} flip="horizontal" />
                {redos.length > 0 ? redos.length : ''}
              </button>
            </div>

            <div class="btn-group">
              <button type="button" class="btn btn-light btn-sm" on:click={flipX} title="Flip horizontal">
                <Icon data={flipIcon} />
              </button>
              <button type="button" class="btn btn-light btn-sm" on:click={flipY} title="Flip vertical">
                <Icon data={flipIcon} style="transform: rotate(90deg);" />
              </button>
            </div>

            <div class="btn-group">
              <button type="button" class="btn btn-light btn-sm" on:click={moveLeft} title="Move left">
                <Icon data={arrowLeftIcon} />
              </button>
              <button type="button" class="btn btn-light btn-sm" on:click={moveRight} title="Move right">
                <Icon data={arrowRightIcon} />
              </button>
              <button type="button" class="btn btn-light btn-sm" on:click={moveUp} title="Move up">
                <Icon data={arrowUpIcon} />
              </button>
              <button type="button" class="btn btn-light btn-sm" on:click={moveDown} title="Move down">
                <Icon data={arrowDownIcon} />
              </button>
            </div>

            <QuickDropdown label="{input.width}W x {input.height}H" on:open={startChangeSize} dropdownClass="below left">
              <Form on:submit={applyChangeSize}>
                <div class="p10">
                  W
                  <input type="number" min={1} max={1500} bind:value={changeSize.width} />
                  <strong>x</strong>
                  H
                  <input type="number" min={1} max={1500} bind:value={changeSize.height} />
                  <button type="submit" class="btn btn-info btn-sm">Apply</button>
                </div>
              </Form>
            </QuickDropdown>

            <div>
              <button type="button" class="btn btn-light btn-sm" on:click={scaleDown} title="Scale down">
                <Icon data={minusIcon} />
                Half size
              </button>

              <button type="button" class="btn btn-light btn-sm" on:click={scaleUp} title="Scale up">
                <Icon data={plusIcon} />
                Double size
              </button>
            </div>

            <InputSelect sm placeholder="Zoom" bind:value={zoom} let:option options={[...Array(11)].map((_, i) => i + 10)}>
              <Icon data={zoomIcon} />
              {option.value}
            </InputSelect>
            <div>
              <label>
                <input type="checkbox" bind:checked={showGrid} />
                Show grid
              </label>
            </div>

            <InputSelect
              disabled={$autoSaveStore[input.name] == null}
              options={$autoSaveStore[input.name]}
              bind:value={selectedAutoSave}
              on:change={e => loadAutoSave(e.detail)}
              let:option
              placeholder="Auto-saves"
              inline
              sm
              right
            >
              {option.name}
              <img src={option.png} height="40" alt="" />
            </InputSelect>
          </div>
        </div>
        <div class="grow canvas-container">
          <canvas class="draw-canvas" bind:this={drawCanvas} />
          <canvas
            class="grid-canvas"
            bind:this={gridCanvas}
            class:paint-cursor={mode == 'paint'}
            class:fill-cursor={mode == 'fill'}
            class:erase-cursor={mode == 'erase'}
            on:pointerdown|preventDefault={onDrawPointerDown}
            on:pointerup|preventDefault={onDrawPointerUp}
            on:pointermove|preventDefault={onDrawPointerMove}
            on:contextmenu|preventDefault
          />
        </div>

        <div class="col2">
          <Form on:submit={() => itemTypeBuilder.save()}>
            <div class="p10">
              <FieldText name="name" bind:value={input.name}>Name</FieldText>
              <FormButtons canDelete={!isAdding} on:delete={() => itemTypeBuilder.del()} {hasChanges} />
            </div>
          </Form>

          <div class="p10">
            <FieldCheckbox name="animated" bind:checked={input.animated} on:change={animatedChanged}>Animated?</FieldCheckbox>

            <div class="preview flex">
              {#if input.animated}
                <div>
                  <FieldNumber name="frameWidth" bind:value={input.frameWidth} max={200} step={1}>Frame width</FieldNumber>
                  <FieldNumber name="frameRate" bind:value={input.frameRate} max={60} min={1} step={1}>Frame rate</FieldNumber>
                  <!-- don't know if we can make this work in pixi, so just have to copy frames maybe
                <FieldCheckbox name="yoyo" bind:checked={input.yoyo}>Loop back?</FieldCheckbox> -->

                  <div class="flex-column">
                    <AnimationPreview {...input} scale={artScale} width={pngCanvas.width} height={pngCanvas.height} />
                    <div class="frame-editor">
                      <img src={input.png} width={pngCanvas.width * artScale} height={pngCanvas.height * artScale} alt="preview frame splits" />
                      {#each [...Array(numFrames)] as x, frameNumber}
                        <div class="frame" style="left: {frameNumber * input.frameWidth * artScale}px; width: {input.frameWidth * artScale}px;">
                          <a href="#/" on:click|preventDefault={() => removeFrame(frameNumber)} class="text-danger">
                            <Icon data={deleteIcon} />
                          </a>
                          <a href="#/" on:click|preventDefault={() => copyFrame(frameNumber)} class="text-info">
                            <Icon data={copyIcon} />
                          </a>
                        </div>
                      {/each}
                    </div>
                  </div>
                </div>
              {/if}
            </div>

            <!-- if tile size, show repeated in x and y-->
            {#if isTileSize}
              <div class="ml-2">
                Tiling preview
                {#each [0, 0, 0] as r}
                  <div class="flex">
                    {#each [0, 0, 0] as margin}
                      {#if input.animated}
                        <AnimationPreview {...input} scale={artScale} width={pngCanvas.width} height={pngCanvas.height} simple />
                      {:else}
                        <img src={input.png} alt="tiling preview" width={input.width * artScale} height={input.height * artScale} />
                      {/if}
                    {/each}
                  </div>
                {/each}
              </div>
            {:else if !input.animated}
              <img src={input.png} width={pngCanvas.width * artScale} height={pngCanvas.height * artScale} alt="" />
            {/if}
          </div>
        </div>
      </div>
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
    width: 40,
    height: 40,
    png: null,

    animated: false,
    frameWidth: 25,
    frameRate: 10,
    // yoyo: false,
  }

  function getItemGraphic(item) {
    return item.id
  }

  //////////// things unique to level builder ////////////
  import {
    arrowLeft as arrowLeftIcon,
    arrowRight as arrowRightIcon,
    arrowUp as arrowUpIcon,
    arrowDown as arrowDownIcon,
    undo as undoIcon,
    eraser as eraseIcon,
    remove as deleteIcon,
    copy as copyIcon,
    searchPlus as zoomIcon,
    minus as minusIcon,
    plus as plusIcon,
  } from 'svelte-awesome/icons'
  import { faFillDrip as fillIcon, faPaintBrush as paintIcon, faExchangeAlt as flipIcon } from '@fortawesome/free-solid-svg-icons'
  import { onMount } from 'svelte'
  import { art } from '../stores/project-stores'
  import AnimationPreview from '../components/AnimationPreview.svelte'
  import autoSaveStore from '../stores/auto-save-store'
  import ColorPicker from '../components/ColorPicker.svelte'
  import debounce from '../services/debounce'
  import FieldCheckbox from '../components/FieldCheckbox.svelte'
  import FieldNumber from '../components/FieldNumber.svelte'
  import FieldText from '../components/FieldText.svelte'
  import Icon from 'svelte-awesome'
  import InputSelect from '../components/InputSelect.svelte'
  import QuickDropdown from '../components/QuickDropdown.svelte'

  let mode = 'paint'
  let undos = []
  let redos = []
  let mouseDown = false
  let showGrid = true
  let selectedColor = 'rgba(0, 0, 0, 255)'
  let selectedAutoSave = null

  // we load the png into this canvas
  // and when user draws on the big canvas, we actually make the change on the scaled down canvas, and then re-render the larger canvas from this one
  // (if we make a change to the larger canvas, it gets blurry when scaling back down)
  const pngCanvas = document.createElement('canvas')
  const pngContext = pngCanvas.getContext('2d')
  const artScale = 1

  // we render a scaled up version to this canvas for user to interact with
  let drawCanvas
  let drawContext
  let zoom = 15

  // we render grid lines to this canvas
  let gridCanvas
  let gridContext

  let changeSize = {
    width: 0,
    height: 0,
  }

  const debouncedRedraw = debounce(() => redraw(), 200)
  $: inputWidth = input?.width
  $: inputHeight = input?.height
  $: numFrames = input != null && input.width != null && input.frameWidth != null ? Math.ceil(input.width / input.frameWidth) : 0
  $: if (inputWidth != 0 && inputHeight != 0 && showGrid != null && zoom != null) debouncedRedraw()
  $: isTileSize = input != null && input.height == 40 && (input.width == 40 || (input.animated && input.frameWidth == 40))

  onMount(() => redraw())

  function loadAutoSave(saveData) {
    input = JSON.parse(JSON.stringify(saveData))
    selectedAutoSave = null
    redraw()
  }

  function reset(undoable = true) {
    if (undoable) addUndoState()
    input.png = null
    redraw()
  }

  function onDrawPointerDown(e) {
    const { x, y } = getScaledEventCoordinates(e)
    const color = getColorAt(x, y)
    if (e.altKey || e.button !== 0) {
      if (color == 'transparent') {
        mode = 'erase'
        selectedColor = 'transparent'
      } else {
        mode = 'paint'
        selectedColor = color
      }
    } else {
      addUndoState()
      mouseDown = true
      onDrawPointerMove(e)
    }
  }

  function onDrawPointerUp(e) {
    mouseDown = false
    // lastDrawnCoordinates = null
  }

  let lastDrawnCoordinates = null
  function onDrawPointerMove(e) {
    if (!mouseDown) return

    const { x, y } = getScaledEventCoordinates(e)
    if (y != null && x != null) {
      if (mode == 'erase') setPixel(x, y, 'transparent')
      else setPixel(x, y, selectedColor)

      if (lastDrawnCoordinates != null) {
        // connect the last drawn coordinates to the new coordinates
        // so we don't get spotty drawing if they're moving cursor too fast for an event to happen for every pixel
        // connectPixels(lastDrawnCoordinates.x, lastDrawnCoordinates.y, x, y, selectedColor)
      }
      lastDrawnCoordinates = { x, y }
    }
  }

  function onKeyUp(e) {
    switch (e.code) {
      case 'KeyZ':
        if (e.ctrlKey) undo()
        break
      case 'KeyY':
        if (e.ctrlKey) redo()
        break
    }
  }

  function onPaste(e) {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items
    for (let index in items) {
      const item = items[index]
      if (item.kind === 'file') {
        const blob = item.getAsFile()
        const reader = new FileReader()
        reader.onload = function (event) {
          const image = new Image()
          image.src = event.target.result
          image.onload = () => {
            input.width = image.width
            input.height = image.height
            input.png = event.target.result
            redraw()
          }
        }
        // data url!
        // callback(blob)
        reader.readAsDataURL(blob)
      }
    }
  }

  function getColorAt(x, y) {
    return toRGB(pngContext.getImageData(x, y, 1, 1).data)
  }

  function getScaledEventCoordinates(e) {
    const x = e.offsetX + e.target.scrollLeft
    const y = e.offsetY + e.target.scrollTop
    // debugger
    return {
      x: Math.floor(x / zoom),
      y: Math.floor(y / zoom),
    }
  }

  function toRGB(d) {
    return d[3] === 0 ? 'transparent' : `rgba(${d[0]}, ${d[1]}, ${d[2]}, ${d[3]})`
  }

  function addUndoState() {
    undos = [...undos.slice(Math.max(undos.length - 20, 0)), JSON.stringify(input)]

    // if we're adding a new undo state, empty redos
    redos = []

    // auto save
    // todo consider making undo/redo store local storaged?
    $autoSaveStore[input.name] = [JSON.parse(JSON.stringify(input)), ...($autoSaveStore[input.name] || []).slice(0, 10)]
  }

  function undo() {
    if (undos.length == 0) return

    redos = [...redos, JSON.stringify(input)]
    input = {
      ...input,
      ...JSON.parse(undos.pop()),
    }
    undos = undos
    redraw()
  }

  function redo() {
    if (redos.length == 0) return

    undos = [...undos, JSON.stringify(input)]
    input = {
      ...input,
      ...JSON.parse(redos.pop()),
    }
    redos = redos
    redraw()
  }

  function setPixel(x, y, color, recursing = false) {
    const oldColor = getColorAt(x, y)
    drawSquare(pngContext, x, y, 1, color)
    drawSquare(drawContext, x * zoom, y * zoom, zoom, color)

    if (mode == 'fill') {
      // recursively loop around this pixel setting pixels that were the same color this one used to be to the new color
      // needs revision
      // right now it works well for filling outlines, but overfills through outlines that only touch on corners
      const coords = [
        { x: -1, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: -1 },
        { x: 0, y: 1 },
      ].map(c => ({
        xn: x + c.x,
        yn: y + c.y,
      }))
      for (let c of coords) {
        if (c.yn < 0 || c.yn > input.height - 1 || c.xn < 0 || c.xn > input.width - 1) continue

        const currentColor = getColorAt(c.xn, c.yn)
        if (currentColor == oldColor) setPixel(c.xn, c.yn, color, true)
      }

      // for (let xn = x - 1; xn <= x + 1; xn += 1) {
      // 	for (let yn = y - 1; yn <= y + 1; yn += 1) {
      // 		if (yn < 0 || yn > input.height - 1 || xn < 0 || xn > input.width * 1 - 1) continue
      // 		const currentColor = getColorAt(xn, yn)
      // 		if (currentColor == oldColor) setColor(xn, yn, color, true)
      // 	}
      // }
    }

    if (!recursing) setInputFromCanvas()
  }

  function connectPixels(x1, y1, x2, y2, color) {
    const xDiff = Math.abs(x1 - x2)
    const yDiff = Math.abs(y1 - y2)

    if (xDiff > yDiff) {
      if (x1 > x2) [x1, x2] = [x2, x1]

      for (let x = x1; x < x2; x++) {
        // const y = ((x - x1) / Math.abs(y2 - y1)) * (y2 - y1) + y1
        setPixel(x, y1, color, true)
      }
    } else {
      if (y1 > y2) [y1, y2] = [y2, y1]

      for (let y = y1; y < y2; y++) {
        // const x = ((y - y1) / Math.abs(x2 - x1)) * (x2 - x1) + x1
        setPixel(x1, y, color, true)
      }
    }

    setInputFromCanvas()
  }

  function drawSquare(context, x, y, size, color) {
    if (color == 'transparent') {
      context.clearRect(x, y, size, size)
    } else {
      context.beginPath()
      context.rect(x, y, size, size)
      context.fillStyle = color
      context.fill()
    }
  }

  function redraw() {
    if (drawCanvas == null || gridCanvas == null) return
    if (drawContext == null) drawContext = drawCanvas.getContext('2d')
    if (gridContext == null) gridContext = gridCanvas.getContext('2d')

    // put source png onto scale canvas
    createMemoryImage(input.png).then(image => {
      // draw png onto scale canvas
      let scaleWidth = image.width
      let scaleHeight = image.height
      // if png size is exactly double input size... we're just importing old data, scale it down
      let wasOutOfScale = scaleWidth == input.width * 2 && scaleHeight == input.height * 2
      if (wasOutOfScale) {
        // should be fine...
        // use input size instead
        scaleWidth = image.width / 2
        scaleHeight = image.height / 2
      }

      pngCanvas.width = input.width
      pngCanvas.height = input.height
      pngContext.clearRect(0, 0, input.width, input.height)

      drawCanvas.width = input.width * zoom
      drawCanvas.height = input.height * zoom
      drawContext.clearRect(0, 0, input.width * zoom, input.height * zoom)

      gridCanvas.width = input.width * zoom
      gridCanvas.height = input.height * zoom
      gridContext.clearRect(0, 0, input.width * zoom, input.height * zoom)

      // draw the png full size, even if it gets cut off
      if (input.png != null && image != null) {
        pngContext.drawImage(image, 0, 0, scaleWidth, scaleHeight)

        // draw image larger on big canvas
        drawContext.save()
        drawContext.scale(zoom, zoom)
        drawContext.imageSmoothingEnabled = false
        drawContext.drawImage(image, 0, 0)
        drawContext.restore()
      }
      setInputFromCanvas()

      if (showGrid) {
        gridContext.strokeStyle = 'rgba(255,255,255,1)'
        for (let x = 1; x < input.width; x++) {
          gridContext.beginPath()
          gridContext.moveTo(x * zoom, 0)
          gridContext.lineTo(x * zoom, input.height * zoom)
          gridContext.stroke()
        }
        for (let y = 1; y < input.height; y++) {
          gridContext.beginPath()
          gridContext.moveTo(0, y * zoom)
          gridContext.lineTo(input.width * zoom, y * zoom)
          gridContext.stroke()
        }
      }
    })
  }

  function flipY() {
    flip(false, true)
  }

  function flipX() {
    flip(true, false)
  }

  function moveLeft() {
    move(-1, 0)
  }

  function moveRight() {
    move(1, 0)
  }

  function moveUp() {
    move(0, -1)
  }

  function moveDown() {
    move(0, 1)
  }

  function rotateLeft() {
    rotate(-90)
  }

  function rotateRight() {
    rotate(90)
  }

  function move(dx, dy) {
    addUndoState()
    const data = pngContext.getImageData(0, 0, input.width, input.height)
    pngContext.putImageData(data, dx, dy)
    if (dx != 0) pngContext.putImageData(data, dx - dx * input.width, 0)
    else if (dy != 0) pngContext.putImageData(data, 0, dy - dy * input.height)
    setInputFromCanvas()
    redraw()
  }

  function flip(flipX, flipY) {
    addUndoState()
    setInputFromCanvas()
    createMemoryImage(input.png).then(image => {
      pngContext.clearRect(0, 0, input.width, input.height)
      pngContext.scale(flipX ? -1 : 1, flipY ? -1 : 1)
      pngContext.drawImage(image, flipX ? input.width * -1 : 0, flipY ? input.height * -1 : 0, input.width, input.height)
      setInputFromCanvas()
      redraw()
    })
  }

  // can't seem to get this to work
  // function rotate(deg) {
  // 	addUndoState()
  // 	setInputFromCanvas()
  // 	createMemoryImage(input.png).then(image => {
  // 	})
  // }

  function setInputFromCanvas() {
    input.png = pngCanvas.toDataURL('image/png')
  }

  function createMemoryImage(png) {
    if (png == null) return Promise.resolve({ width: input.width, height: input.height })
    return new Promise((resolve, reject) => {
      const image = new Image()
      image.src = input.png
      image.onload = () => resolve(image)
    })
  }

  function removeFrame(frameIndex) {
    addUndoState()
    const frameStartX = frameIndex * input.frameWidth
    const framesAfterData = pngContext.getImageData(frameStartX + input.frameWidth, 0, input.width, input.height)

    pngContext.clearRect(frameStartX, 0, input.width, input.height)
    pngContext.width = input.width - input.frameWidth
    pngContext.putImageData(framesAfterData, frameStartX, 0)

    setInputFromCanvas()
    redraw()

    input.width -= input.frameWidth
  }

  function copyFrame(frameIndex) {
    addUndoState()
    const frameStartX = frameIndex * input.frameWidth
    const existingFramesData = pngContext.getImageData(0, 0, input.width, input.height)
    const frameData = pngContext.getImageData(frameStartX, 0, input.frameWidth, input.height)
    pngCanvas.width = pngCanvas.width + input.frameWidth
    // changing width clears old content, so we have to re-draw old frames too
    pngContext.putImageData(existingFramesData, 0, 0)
    pngContext.putImageData(frameData, input.width, 0)
    setInputFromCanvas()
    input.width += input.frameWidth
  }

  function scaleUp() {
    scale(2)
  }

  function scaleDown() {
    scale(0.5)
  }

  function scale(s) {
    addUndoState()
    createMemoryImage(input.png).then(image => {
      pngCanvas.width = input.width * s
      pngCanvas.height = input.height * s
      pngContext.scale(s, s)
      pngContext.imageSmoothingEnabled = false
      pngContext.drawImage(image, 0, 0)
      pngContext.restore()

      setInputFromCanvas()
      input.width = Math.ceil(input.width * s)
      input.height = Math.ceil(input.height * s)
      input.frameWidth = Math.ceil(input.frameWidth * s)
    })
  }

  // set frame width to width if they're turning on animation for first time
  function animatedChanged() {
    if (input.animated) {
      input.frameWidth = input.width
    }
  }

  function startChangeSize() {
    changeSize.width = input.width
    changeSize.height = input.height
    changeSize.scale = 1
  }

  function applyChangeSize() {
    input.width = changeSize.width
    input.height = changeSize.height
  }
</script>

<style lang="scss">
  @import '../scss/variables';
  .art-actions {
    padding: 10px;
    text-align: right;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 10px;
    position: relative;
    z-index: 10;

    input[type='number'] {
      width: 50px;
    }
  }

  .canvas-container {
    overflow: auto;

    .grid-canvas {
      position: absolute;
      left: 0;
      top: 0;
      touch-action: none;
    }

    .draw-canvas {
      background: repeating-linear-gradient(-45deg, transparent, #eee 10px);
      touch-action: none;
      @include med-box-shadow();
    }
  }

  .paint-cursor {
    cursor: url(/paint-icon.png) 0 20, url(/kid-projects/public/paint-icon.png) 0 20, auto;
  }
  .fill-cursor {
    cursor: url(/fill-icon.png) 20 20, url(/kid-projects/public/fill-icon.png) 20 20, auto;
  }
  .erase-cursor {
    cursor: url(/erase-icon.png) 0 20, url(/kid-projects/public/erase-icon.png) 0 20, auto;
  }

  .frame-editor {
    position: relative;
    padding-top: 25px;
    padding-bottom: 25px;

    .frame {
      position: absolute;
      top: 0;
      bottom: 0;
      border-right: 1px solid #333;
      text-align: center;

      a {
        position: absolute;
        left: 2px;

        &:first-child {
          top: 0;
        }
        &:last-child {
          bottom: 0;
        }
      }
    }
  }
</style>
