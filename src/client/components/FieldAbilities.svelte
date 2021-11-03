<div class="form-group">
  <div class="strong">
    <slot />
  </div>
  <div>
    <table cellspacing="0">
      <tbody>
        {#if value?.length}
          {#each value as itemAbility, i}
            <tr>
              <td>
                <AbilityPicker name="ability-picker-{i}" bind:value={itemAbility.id} placeholder="Ability" />
              </td>
              {#if keyAssignable}
                <td>
                  <InputSelect name="ability-key-{i}" inline options={abilityKeys} let:option bind:value={itemAbility.key} placeholder="Key"
                    >{option.value.toUpperCase()}</InputSelect
                  >
                </td>
              {/if}
              <td>
                <ArtPicker name="abililty-character-art-{i}" bind:value={itemAbility.characterArt} placeholder="Character art when using ability" />
              </td>
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
  import ArtPicker from './ArtPicker.svelte'

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
  td {
    padding: 5px;
    border-bottom: 1px solid #ccc;
  }

  a {
    cursor: pointer;
  }
</style>
