<div>
  <InputSelect inline {name} bind:value let:option {options} filterable={options.length > 3} {placeholder}>
    {#if option.graphic}
      <ArtThumb id={option.graphic} />
    {/if}
    {option.name}
  </InputSelect>
</div>
{#if value != null}
  <a href="#/particles/{value}" class="ml-1">Edit {$project.particles[value].name} particles</a>
{/if}

<script>
  import { sortByName } from '../services/object-utils'
  import ArtThumb from './ArtThumb.svelte'
  import project from '../stores/active-project-store'
  import InputSelect from './InputSelect.svelte'
  export let value = null
  export let name = 'particles-picker'
  export let placeholder = 'Select particles'

  $: options = [
    { value: null, name: 'No particles' },
    ...Object.values($project.particles)
      .map(p => ({
        ...p,
        value: p.id,
      }))
      .sort(sortByName),
  ]
</script>
