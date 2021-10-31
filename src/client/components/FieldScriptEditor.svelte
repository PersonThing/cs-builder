<!-- TODO: apparently you can embed vs code now ? might be worth playing with

https://playground.babylonjs.com/
-->

<div class="form-group">
  <label for={name}>
    <slot />
  </label>

  <pre bind:this={element} class="lang-javascript">{value}</pre>
  <!-- <pre>{parseKidScript(value)}</pre> -->

  {#if examples}
    <div class="examples">
      <label>Sample code:</label>
      <pre bind:this={examplesElement} class="lang-javascript">{examples}</pre>
    </div>
  {/if}
</div>

<script>
  import { CodeJar } from 'codejar'
  import { onMount, onDestroy } from 'svelte'
  import { withLineNumbers } from 'codejar/linenumbers'
  // import parseKidScript from '../services/kid-script-parser.js'
  import Prism from 'prismjs'

  export let value = null
  export let name = 'text'
  export let examples = null

  let element
  let examplesElement
  let jar

  // when value changes externally, refresh jar
  $: if (jar != null && value != jar.toString()) {
    jar.updateCode(value)
  }

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
