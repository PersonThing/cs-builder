<div class="grow p20">
  <h2>Create character</h2>
  {#if input}
    <Form on:submit={createCharacter}>
      <FieldText name="name" bind:value={input.name} autofocus>Name</FieldText>
      <FieldCharacterPicker name="class-id" bind:value={input.classId}>Character class</FieldCharacterPicker>
      <SaveBtn disabled={!valid} />
    </Form>
  {/if}
</div>

<script>
  import { characterclasses, characters, project, projects } from '../stores/project-stores.js'
  import { push } from 'svelte-spa-router'
  import FieldCharacterPicker from '../components/FieldCharacterPicker.svelte'
  import FieldText from '../components/FieldText.svelte'
  import Form from '../components/Form.svelte'
  import SaveBtn from '../components/SaveBtn.svelte'

  let input = null

  $: if ($project != null && $characterclasses != null) createDefaultInput()

  function createDefaultInput() {
    input = {
      name: '',
      classId: $characterclasses.length ? $characterclasses[0].id : null,
      projectId: $project.id,
    }
  }

  projects.refresh()
  $: valid = input.name?.trim().length > 3 && input.classId != null

  function createCharacter() {
    characters.apiInsert(input).then(() => {
      push('/play/')
    })
  }
</script>
