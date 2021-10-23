<div class="form-group">
  <label for={name}>
    <slot />
  </label>
  <textarea {name} id={name} type="text" bind:value class="form-control" bind:this={field} {placeholder} />
  <pre>
// Examples:
// change speed:
sprite.speed += 1

sprite.speed = sprite.speed * sprite.speed

// change size:
sprite.scale.x *= 2
sprite.scale.y *= 2

// create text:
const text = new PIXI.Text('Your text here', &#123; fontFamily: 'Arial', fontSize: 18, fill : 0xffffff &#125;)
text.x = -100
text.y = -50
sprite.addChild(text)

// turn off an effect after 5 seconds
setTimeout(() => &#123;
  sprite.speed -= 1
&#125;, 5000)
  </pre>
</div>

<script>
  export let value = null
  export let name = 'text'
  export let placeholder = null

  let field
</script>

<style>
  textarea {
    width: 100%;
    height: 200px;
  }

  pre {
    margin-top: 0;
    background: #eee;
    padding: 20px;
  }
</style>
