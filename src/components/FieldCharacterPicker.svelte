<div class="form-group">
  <label for="graphic">
    <slot>Characters</slot>
  </label>
  <div>
    <InputSelect multiple {options} bind:value let:option inline filterable={options.length > 2}>
      <ArtThumb id={option.graphics.moving} />
      {option.name}
    </InputSelect>
  </div>
</div>

<script>
  import { sortByName } from '../services/object-utils'
  import project from '../stores/active-project-store'
  import ArtThumb from './ArtThumb.svelte'
  import InputSelect from './InputSelect.svelte'
  export let value = []

  $: options = Object.values($project.characters)
    .map(c => ({
      ...c,
      value: c.id,
    }))
    .sort(sortByName)
</script>
