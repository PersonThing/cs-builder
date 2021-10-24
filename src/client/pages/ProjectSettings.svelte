<AppLayout active="project">
  <div class="grow">
    <Form on:submit={save}>
      <div class="p1">
        <FieldText name="name" bind:value={input.name}>Name</FieldText>
        <FieldNumber name="pixel-size" bind:value={input.pixelSize} min={1} max={10} step={0.1}>Pixel size</FieldNumber>
        <FormButtons {hasChanges} />
      </div>
    </Form>
  </div>
</AppLayout>

<script>
  import AppLayout from '../components/AppLayout.svelte'
  import FieldNumber from '../components/FieldNumber.svelte'
  import Form from '../components/Form.svelte'
  import validator from '../services/validator'
  import { project, projects } from '../stores/project-stores.js'
  import FieldText from '../components/FieldText.svelte'
  import FormButtons from '../components/FormButtons.svelte'

  let input = createDefaultInput()

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
    }
  }

  function save() {
    const p = {
      ...$project,
      name: input.name,
      pixelSize: input.pixelSize,
    }
    project.set(p)
    projects.apiUpdate(p)
  }
</script>
