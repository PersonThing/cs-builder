<div class="form-group">
  <label for={name}>
    <slot />
  </label>

  <pre bind:this={element} class="lang-javascript">{value}</pre>

  {#if examples}
    <div class="examples">
      <label>Sample code:</label>
      <pre bind:this={examplesElement} class="lang-javascript">{examples}</pre>
    </div>
  {/if}
</div>

<script>
  import { CodeJar } from 'codejar'
  import Prism from 'prismjs'
  import { withLineNumbers } from 'codejar/linenumbers'
  import { onMount, onDestroy } from 'svelte'

  export let value = null
  export let name = 'text'
  export let examples = null

  let element
  let examplesElement
  let jar

  onMount(() => {
    jar = CodeJar(
      element,
      withLineNumbers(el => Prism.highlightElement(el, false), {
        color: '#ddd',
      }),
      { tab: '  ' }
    )
    jar.onUpdate(code => {
      value = code
    })

    if (examples) {
      Prism.highlightElement(examplesElement, false)
    }
  })

  onDestroy(() => {
    jar.destroy()
  })
</script>

<style lang="scss" global>
  @import 'prismjs/themes/prism';
</style>
