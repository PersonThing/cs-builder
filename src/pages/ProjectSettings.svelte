<AppLayout active="project">
  <div class="grow p1">
    <Form on:submit={save} {hasChanges}>
      <FieldText name="name" bind:value={input.name}>Name</FieldText>
      <FieldRadioGroup name="game-type" bind:value={input.gameType} options={gameTypeOptions} let:option>Game type</FieldRadioGroup>
      <FieldNumber name="pixel-size" bind:value={input.pixelSize} min={1} max={10} step={1}>Pixel size</FieldNumber>
    </Form>
  </div>
</AppLayout>

<script>
  import AppLayout from '../components/AppLayout.svelte'
  import FieldRadioGroup from '../components/FieldRadioGroup.svelte'
  import FieldNumber from '../components/FieldNumber.svelte'
  import Form from '../components/Form.svelte'
  import validator from '../services/validator'
  import project from '../stores/active-project-store'
  import FieldText from '../components/FieldText.svelte'

  let gameTypeOptions = [
    { value: 'side', label: 'Side-scrolling' },
    { value: 'top', label: 'Top-down' },
  ]

  let input = {
    ...createDefaultInput(),
    ...$project,
  }

  $: hasChanges = !validator.equals(input, $project)

  function createDefaultInput() {
    return {
      name: '',
      gameType: 'side',
      pixelSize: 1,
    }
  }

  function save() {
    $project.name = input.name
    $project.gameType = input.gameType
    $project.pixelSize = input.pixelSize
  }
</script>
