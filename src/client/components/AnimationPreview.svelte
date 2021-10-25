<!--
	use window.requestAnimationFrame to move background image spritesheet around
	would be nice to use css keyframe animations with steps() instead, but would need to do some hackish stuff to get keyframes into DOM
	-->

{#if png != null}
  {#if !simple}
    <div class="animation-preview-container">
      <div
        style="background-repeat: no-repeat; background-image: url({png}); background-position: {width * scale -
          frameWidth * scale * (frameIndex + 1)}px
				top; background-size: {width * scale}px {height * scale}px; width: {width * scale * 2 - frameWidth * scale}px; height: {height * scale}px;"
      />
      <div class="animation-preview-cover" style="left: 0; width: {width * scale - frameWidth * scale}px;" />
      <div class="animation-preview-cover" style="left: {width * scale}px; width: {width * scale - frameWidth * scale}px;" />
    </div>
  {:else}
    <div
      class="animation-preview"
      style="background-repeat: no-repeat; background-image: url({png}); background-position: {frameIndex * -frameWidth * scale}px top;
			background-size: {width * scale}px {height * scale}px; width: {frameWidth * scale}px; height: {height * scale}px;"
    />
  {/if}
{/if}

<script>
  import { onDestroy } from 'svelte'

  export let png
  export let width
  export let height
  export let frameWidth
  export let frameRate
  export let scale = 1
  // export let yoyo

  export let simple = false

  let frameIndex = 0
  let frameDelta = 1
  let frame = 0

  $: numFrames = width != null ? Math.ceil(width / frameWidth) : 0

  $: if (png != null) {
    frameIndex = 0
    frameDelta = 1
  }

  // change the graphic every 60 / frameRate frames
  $: if (frame > 60 / frameRate) {
    if (numFrames > 1) {
      // if (yoyo) {
      //   if ((frameIndex == 0 && frameDelta == -1) || (frameIndex == numFrames - 1 && frameDelta == 1)) frameDelta *= -1
      //   frameIndex += frameDelta
      // } else {
      frameIndex = frameIndex >= numFrames - 1 ? 0 : frameIndex + 1
      // }
    } else {
      frameIndex = 0
    }
    frame = 0
  }

  let lastRequestedFrame

  animate()

  function animate() {
    lastRequestedFrame = window.requestAnimationFrame(() => {
      frame++
      animate()
    })
  }

  onDestroy(() => {
    window.cancelAnimationFrame(lastRequestedFrame)
  })
</script>

<style lang="scss">
  .animation-preview-container {
    position: relative;
  }

  .animation-preview-cover {
    position: absolute;
    top: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.75);
    backdrop-filter: grayscale(100%);
  }
</style>
