<div>
  <InputSelect inline {name} bind:value let:option {options} filterable={options.length > 3} {placeholder}>
    {#if option.graphic}
      <ArtThumb id={option.graphic} />
    {/if}
    {option.name}
  </InputSelect>
</div>
{#if selected}
  <a href="#/particles/{value}" class="ml-1">Edit {$selected.name} particles</a>
{/if}

<script>
  import { sortByName } from '../services/object-utils'
  import { particles } from './stores/project-stores'
  import ArtThumb from './ArtThumb.svelte'
  import InputSelect from './InputSelect.svelte'
  export let value = null
  export let name = 'particles-picker'
  export let placeholder = 'Select particles'

  $: options = [
    { value: null, name: 'No particles' },

    ...$particles
      .map(p => ({
        ...p,
        value: p.id,
      }))
      .sort(sortByName),
  ]

  $: selected = options?.find(o => o.value == value)
</script>
