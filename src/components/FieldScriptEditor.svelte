<div class="form-group">
  <label for={name}>
    <slot />
  </label>
  <textarea {name} id={name} type="text" bind:value class="form-control" bind:this={field} {placeholder} />
</div>

<script>
  import { onMount } from 'svelte'

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
</style>
