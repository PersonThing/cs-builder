<div class="form-group">
  <label>
    <slot />
  </label>
  <div>
    <table cellspacing="0">
      {#if keyAssignable}
        <thead>
          <tr>
            <th>Ability</th>
            <th>Key</th>
            <th />
          </tr>
        </thead>
      {/if}
      <tbody>
        {#if value?.length}
          {#each value as itemAbility, i}
            <tr>
              <td>
                <AbilityPicker name="ability-picker-{i}" bind:value={itemAbility.id} />
              </td>
              {#if keyAssignable}
                <td>
                  <InputSelect name="ability-key-{i}" inline options={abilityKeys} let:option bind:value={itemAbility.key}>{option.value}</InputSelect
                  >
                </td>
              {/if}
              <td>
                <a href={null} on:click|preventDefault={() => removeAbility(i)}>Remove</a>
              </td>
            </tr>
          {/each}
        {/if}
        <tr>
          <td colspan="3">
            <a href={null} on:click|preventDefault={addAbility}>Add ability</a>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

<script>
  import InputSelect from './InputSelect.svelte'
  import AbilityPicker from './AbilityPicker.svelte'
  import abilityKeys from '../services/ability-keys.js'

  export let value = null
  export let keyAssignable = true

  $: if (value == null) value = []

  function addAbility() {
    if (value == null) value = []

    value = [...value, createDefaultAbility()]
  }

  function removeAbility(i) {
    value.splice(i, 1)
    value = value
  }

  function createDefaultAbility() {
    const ability = {
      id: null,
    }
    if (keyAssignable) {
      ability.key = null
    }
    return ability
  }
</script>

<style>
  th {
    text-align: left;
  }

  th,
  td {
    padding: 5px;
    border-bottom: 1px solid #ccc;
  }

  a {
    cursor: pointer;
  }
</style>
