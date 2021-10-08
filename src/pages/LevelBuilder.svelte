<AppLayout active="levels">
  <div class="col1">
    <ItemListNav slug="levels" type="level" collection={$project.levels} active={paramId} let:item>
      <div class="level-nav-item" style="background-image:url({item.thumbnail})">
        {item.name}
      </div>
    </ItemListNav>
  </div>
  <div class="grow">
    <div bind:this={pixiContainer} on:click={placeBlock} />
  </div>
  <div class="col2 rows">
    <div class="grow">Name, background, other settings</div>
    <div class="grow">Properties of selected item, if any</div>
  </div>
</AppLayout>

<script>
  import AppLayout from '../components/AppLayout.svelte'
  import ItemListNav from '../components/ItemListNav.svelte'
  import project from '../stores/active-project-store'
  import { onMount } from 'svelte'

  export let params = {}
  $: paramId = decodeURIComponent(params.id) || 'new'

  let sampleLevel = {
    blocks: [
      { x: 0, y: 0, blockId: 0 },
      { x: 1, y: 0, blockId: 0 },
      { x: 1, y: 3, blockId: 0 },
      { x: 2, y: 4, blockId: 0 },
      { x: 3, y: 5, blockId: 0 },
      { x: 4, y: 6, blockId: 1 },
      { x: 1, y: 1, blockId: 1 },
      { x: 1, y: 2, blockId: 1 },
    ],
    enemies: [],
  }

  let pixiContainer
  let pixiApp

  onMount(() => {
    pixiApp = new PIXI.Application()
    pixiContainer.appendChild(pixiApp.view)
    renderLevel(sampleLevel)
  })

  function renderLevel(level) {
    for (const blockConfig of level.blocks) {
      const block = $project.blocks[blockConfig.blockId]
      const art = $project.art[block.graphic]
      console.log(art)
      let blockSprite = PIXI.Sprite.from(art.png)
      blockSprite.x = blockConfig.x * art.width
      blockSprite.y = blockConfig.y * art.height
      pixiApp.stage.addChild(blockSprite)
    }
  }

  function placeBlock(event) {
    const x = Math.floor(event.offsetX / 40)
    const y = Math.floor(event.offsetY / 40)
    console.log(x, y)

    sampleLevel.blocks = [...sampleLevel.blocks, { x, y, blockId: 0 }]
    renderLevel(sampleLevel)
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
