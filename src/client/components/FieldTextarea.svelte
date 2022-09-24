<div class="form-group">
  <label for={name}>
    <slot />
  </label>
  <textarea {name} id={name} bind:value class="form-control" {placeholder} bind:this={input} />
</div>

<script>
  import { onMount } from 'svelte'
  export let value = null
  export let name = 'text'
  export let placeholder = null
  export let autofocus
  let input

  onMount(() => {
    if (input != null && autofocus) {
      input.focus()
    }
  })
</script>
