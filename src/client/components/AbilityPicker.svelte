<InputSelect {name} bind:value let:option {options} filterable={options.length > 3} {placeholder}>
  <ArtThumb id={option.graphic} />
  {option.name}
</InputSelect>
{#if selected}
  <a href="#/abilities/{value}" class="ml-1">Edit {selected.name}</a>
{/if}

<script>
  import { sortByName } from '../services/object-utils'
  import { abilities } from '../stores/project-stores'
  import InputSelect from './InputSelect.svelte'
  import ArtThumb from './ArtThumb.svelte'

  export let value = null
  export let name = 'ability-picker'
  export let placeholder = 'Select ability'

  $: options = $abilities
    .map(a => ({
      ...a,
      value: a.id,
    }))
    .sort(sortByName)

  $: selected = options?.find(o => o.value == value)
</script>
