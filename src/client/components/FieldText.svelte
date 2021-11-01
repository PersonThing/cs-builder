<div class="form-group">
  <label for={name}>
    <slot />
  </label>
  <input {name} id={name} type="text" bind:value class="form-control" {placeholder} />
</div>

<script>
  export let value = null
  export let name = 'text'
  export let placeholder = null
</script>
