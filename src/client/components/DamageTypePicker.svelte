<InputSelect {name} bind:value let:option {options} filterable={options.length > 3} {placeholder}>
  <div style="color: #{option.color.toString(16)}" class="strong">{option.name}</div>
</InputSelect>

<script>
  import { sortByName } from '../services/object-utils'
  import damageTypes from '../config/damage-types.js'
  import InputSelect from './InputSelect.svelte'

  export let value = null
  export let name = 'damage-type-picker'
  export let placeholder = 'Select damage type'

  $: options = Object.values(damageTypes)
    .map(dt => ({
      ...dt,
      value: dt.name,
    }))
    .sort(sortByName)
</script>
