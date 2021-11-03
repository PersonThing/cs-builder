<div class="form-group">
  <div class="strong"><slot /></div>
  {#each options as option, index}
    <div class="form-radio">
      <input name="{name}{index}" id="{name}{index}" type="radio" class="form-radio-input" bind:group={value} value={option.value} />
      <label class="form-radio-label" for="{name}{index}">{option.label}</label>
    </div>
  {/each}
</div>

<script>
  export let name = 'check'
  export let options
  export let value
</script>
