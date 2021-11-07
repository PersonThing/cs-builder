<AppLayout active="project">
  <div class="grow p10">
    <h2>Game settings</h2>
    <Form on:submit={save}>
      <FieldText name="name" bind:value={input.name}>Name</FieldText>
      <FieldText name="currency" bind:value={input.currency}>Currency label (Gold, etc)</FieldText>
      <FieldNumber name="pixel-size" bind:value={input.pixelSize} min={1} max={10} step={0.1}>Pixel size</FieldNumber>
      <div class="form-group">
        <div class="strong">People who can edit this project</div>
        <div class="owners">
          {#each input.owners as owner, i}
            <div>{owner} <a href={null} on:click={() => removeOwner(owner)}>Remove</a></div>
          {/each}
          <div>
            <input bind:this={newOwnerField} type="text" bind:value={newOwner} placeholder="New owner username" />
            <button type="button" on:click={addOwner}>Add owner</button>
          </div>
        </div>
      </div>
      <FormButtons {hasChanges} />
    </Form>
  </div>
</AppLayout>

<script>
  import { project, projects } from '../stores/project-stores.js'
  import AppLayout from '../components/AppLayout.svelte'
  import FieldNumber from '../components/FieldNumber.svelte'
  import FieldText from '../components/FieldText.svelte'
  import Form from '../components/Form.svelte'
  import FormButtons from '../components/FormButtons.svelte'
  import validator from '../services/validator'

  let input = createDefaultInput()
  let newOwner = ''
  let newOwnerField

  $: hasChanges = !validator.equals(input, $project)

  $: if (input.id == null && $project.id != null) {
    input = {
      ...createDefaultInput(),
      ...$project,
    }
  }

  function createDefaultInput() {
    return {
      id: null,
      name: '',
      pixelSize: 1,
      owners: [],
      currency: 'Gold',
    }
  }

  function save() {
    const p = {
      ...$project,
      name: input.name,
      pixelSize: input.pixelSize,
      owners: input.owners,
      currency: input.currency,
    }
    project.set(p)
    projects.apiUpdate(p)
  }

  function addOwner() {
    input.owners = [...input.owners, newOwner]
    newOwner = ''
    newOwnerField.focus()
  }

  function removeOwner(username) {
    input.owners = input.owners.filter(o => o !== username)
  }
</script>
