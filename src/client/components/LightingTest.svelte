<div bind:this={pixiContainer} class="pixi-container" />

<script>
  import { Application, Sprite, Container } from 'pixi.js'
  import { Layer, Stage } from '@pixi/layers'
  import { diffuseGroup, normalGroup, lightGroup, PointLight } from 'pixi-lights'
  import { square } from 'svelte-awesome/icons'

  let pixiContainer

  $: if (pixiContainer != null) startPixi()

  function startPixi() {
    const app = new Application({
      backgroundColor: 0x000000, // Black is required!
      width: 800,
      height: 600,
      resizeTo: pixiContainer,
    })
    pixiContainer.appendChild(app.view)

    // Use the pixi-layers Stage instead of default Container
    app.stage = new Stage()

    // Add the background diffuse color
    const diffuse = Sprite.from('/BGTextureTest.jpg')
    diffuse.parentGroup = diffuseGroup

    // Add the background normal map
    const normals = Sprite.from('/BGTextureNORM.jpg')
    normals.parentGroup = normalGroup

    // Create the point light
    const light = new PointLight(0xffffff, 1, 100)
    light.x = app.screen.width / 2
    light.y = app.screen.height / 2
    light.falloff = [0.75, 1, 300]

    // another light
    const light2 = new PointLight(0xffffff, 1, 100)
    light2.x = 100
    light2.y = 100
    light2.falloff = [0.3, 3, 20]

    const light3 = new PointLight(0xffffff, 1, 100)
    light3.x = 300
    light3.y = 100
    light3.falloff = [0.75, 3, 20]

    // Create a background container
    const background = new Container()
    background.addChild(normals, diffuse, light, light2, light3)

    app.stage.addChild(
      // put all layers for deferred rendering of normals
      new Layer(diffuseGroup),
      new Layer(normalGroup),
      new Layer(lightGroup),
      // Add the lights and images
      background
    )

    app.stage.interactive = true

    app.stage.on('pointermove', e => {
      light.x = e.data.global.x
      light.y = e.data.global.y
    })
  }
</script>

<style>
  .pixi-container {
    height: 700px;
    width: 100%;
    border: 1px solid red;
  }
</style>
