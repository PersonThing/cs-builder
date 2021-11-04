<div class="form-group">
  <label for="graphic">
    <slot>Character classes</slot>
  </label>
  <div>
    <InputSelect {multiple} {options} bind:value let:option inline filterable={options.length > 2}>
      <ArtThumb id={option.graphics.moving} />
      {option.name}
    </InputSelect>
  </div>
</div>

<script>
  import { sortByName } from '../services/object-utils'
  import { characterclasses } from '../stores/project-stores'
  import ArtThumb from './ArtThumb.svelte'
  import InputSelect from './InputSelect.svelte'
  export let value = []

  export let multiple = false

  $: options = $characterclasses
    .map(c => ({
      ...c,
      value: c.id,
    }))
    .sort(sortByName)
</script>
