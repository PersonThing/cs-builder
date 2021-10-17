<AppLayout active="enemies">
  <div class="col1">
    <ItemListNav slug="enemies" type="character" collection={$project.enemies} active={paramId} let:item>
      <ArtThumb id={item.graphics.still} />
      {item.name}
    </ItemListNav>
  </div>
  <div class="grow p1">
    <Form on:submit={save} {hasChanges}>
      <FieldText name="name" bind:value={input.name} placeholder="Type a name...">Name</FieldText>
      <FieldNumber name="speed" bind:value={input.speed} placeholder="Speed (pixels per frame)">Speed (pixels per frame)</FieldNumber>
      <FieldArtPicker bind:value={input.graphics.still}>Still graphics</FieldArtPicker>
      <FieldArtPicker bind:value={input.graphics.moving}>Moving graphics</FieldArtPicker>

      <span slot="buttons">
        {#if !isAdding}
          <button type="button" class="btn btn-danger" on:click={del}>Delete</button>
        {/if}
      </span>
    </Form>
  </div>
  <div class="col2">Preview maybe?</div>
</AppLayout>

<script>
  import AppLayout from '../components/AppLayout.svelte'
  import ArtThumb from '../components/ArtThumb.svelte'
  import FieldArtPicker from '../components/FieldArtPicker.svelte'
  import FieldText from '../components/FieldText.svelte'
  import FieldNumber from '../components/FieldNumber.svelte'
  import Form from '../components/Form.svelte'
  import ItemListNav from '../components/ItemListNav.svelte'
  import project from '../stores/active-project-store'
  import validator from '../services/validator'
  import { push } from 'svelte-spa-router'
  import { getNextId } from '../stores/project-store'

  export let params = {}
  let input = createDefaultInput()

  $: paramId = decodeURIComponent(params.id) || 'new'
  $: paramId == 'new' ? create() : edit(paramId)
  $: isAdding = input.id == null
  $: hasChanges = input != null && !validator.equals(input, $project.enemies[input.id])

  function createDefaultInput() {
    return {
      name: '',
      graphics: {
        still: null,
        moving: null,
      },
      abilities: [],
    }
  }

  function create() {
    input = createDefaultInput()
  }

  function edit(name) {
    if (!$project.enemies.hasOwnProperty(name)) return
    input = {
      ...createDefaultInput(),
      ...JSON.parse(JSON.stringify($project.enemies[name])),
    }
  }

  function save() {
    if (validator.empty(input.name)) {
      document.getElementById('name').focus()
      return
    }
    if (isAdding) input.id = getNextId($project.enemies)
    $project.enemies[input.id] = JSON.parse(JSON.stringify(input))
    push(`/enemies/${encodeURIComponent(input.id)}`)
  }

  function del() {
    if (confirm(`Are you sure you want to delete "${input.name}"?`)) {
      delete $project.enemies[input.id]
      $project.enemies = $project.enemies
      $project.levels = $project.levels.map(l => {
        l.enemies = l.enemies.filter(i => i.id != input.id)
        return p
      })
      push(`/enemies/new`)
    }
  }
</script>
