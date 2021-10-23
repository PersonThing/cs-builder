<div class="form-group">
  <label for={name}>
    <slot />
  </label>
  <div>
    <InputSelect inline {name} bind:value let:option {options} filterable={options.length > 3} {placeholder}>
      <ArtThumb id={option.id} />
      {option.name}
    </InputSelect>
  </div>
  {#if selected}
    <a href="#/art/{value}" class="ml-1">Edit {selected.name} art</a>
  {/if}
</div>

<script>
  import { sortByName } from '../services/object-utils'
  import { art } from '../stores/project-stores'
  import InputSelect from './InputSelect.svelte'
  import ArtThumb from './ArtThumb.svelte'

  export let value = null
  export let name = 'art-picker'
  export let placeholder = 'Select art'

  $: options = $art
    .map(a => ({
      ...a,
      value: a.id,
    }))
    .sort(sortByName)

  $: selected = options?.find(o => o.value == value)
</script>
