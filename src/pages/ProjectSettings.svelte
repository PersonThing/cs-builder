<AppLayout active="project">
  <div class="grow p1">
    <Form on:submit={save} {hasChanges}>
      <FieldText name="name" bind:value={input.name}>Name</FieldText>
      <FieldNumber name="pixel-size" bind:value={input.pixelSize} min={1} max={10} step={0.1}>Pixel size</FieldNumber>
    </Form>
  </div>
</AppLayout>

<script>
  import AppLayout from '../components/AppLayout.svelte'
  import FieldNumber from '../components/FieldNumber.svelte'
  import Form from '../components/Form.svelte'
  import validator from '../services/validator'
  import project from '../stores/active-project-store'
  import FieldText from '../components/FieldText.svelte'

  let input = {
    ...createDefaultInput(),
    ...$project,
  }

  $: hasChanges = !validator.equals(input, $project)

  function createDefaultInput() {
    return {
      name: '',
      pixelSize: 1,
    }
  }

  function save() {
    $project.name = input.name
    $project.pixelSize = input.pixelSize
  }
</script>
