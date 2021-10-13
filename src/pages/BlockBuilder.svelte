<AppLayout active="blocks">
  <div class="col1">
    <ItemListNav slug="blocks" type="block" collection={$project.blocks} active={paramId} let:item>
      <ArtThumb id={item.graphic} />
      {item.name}
    </ItemListNav>
  </div>
  <div class="grow p1">
    <Form on:submit={save} {hasChanges}>
      <FieldText name="name" bind:value={input.name} placeholder="Type a name...">Name</FieldText>
      <FieldArtPicker bind:value={input.graphic}>Graphic</FieldArtPicker>
      <FieldParticles name="particles" bind:value={input.particles} />
      <FieldCheckbox name="can-walk" bind:checked={input.canWalk}>
        Can walk on?
        <div class="help-text">Can players walk on or through this block?</div>
      </FieldCheckbox>
      <FieldCheckbox name="can-see" bind:checked={input.canSee}>
        Can see through / across?
        <div class="help-text">Can players and enemies see through / across this block?</div>
      </FieldCheckbox>
      <FieldCheckbox name="consumable" bind:checked={input.consumable}>Consumable by player?</FieldCheckbox>
      {#if input.consumable}
        <div class="field-group">
          <FieldNumber name="healthOnConsume" bind:value={input.healthOnConsume}>Health on consume?</FieldNumber>
          <FieldNumber name="scoreOnConsume" bind:value={input.scoreOnConsume}>Score on consume?</FieldNumber>
          <FieldCharacterPicker name="followerOnConsume" bind:value={input.followerOnConsume}>Spawn follower on consume?</FieldCharacterPicker>
          <FieldEnemyPicker name="enemyOnConsume" bind:value={input.enemyOnConsume}>Spawn enemy on consume?</FieldEnemyPicker>
        </div>
      {/if}
      <FieldCheckbox name="throwOnTouch" bind:checked={input.throwOnTouch}>
        Throw on touch?
        <div class="help-text">Throw anything that touches this block.</div>
      </FieldCheckbox>
      <FieldCheckbox name="teleportOnTouch" bind:checked={input.teleportOnTouch}>
        Teleport on touch?
        <div class="help-text">Teleport any players that touch this block to the nearest block of the same type.</div>
      </FieldCheckbox>
      <FieldCheckbox name="flipGravityOnTouch" bind:checked={input.flipGravityOnTouch}>
        Flip gravity on touch?
        <div class="help-text">Flips gravity for any character or enemy that touches this block.</div>
      </FieldCheckbox>
      <FieldNumber name="damage" bind:value={input.damage}>
        Damage
        <div class="help-text">When players or enemies touch this block, how much damage should they take (per frame in contact)?</div>
      </FieldNumber>
      <FieldCheckbox name="winOnTouch" bind:checked={input.winOnTouch}>Win level if you touch the block?</FieldCheckbox>

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
  import Form from '../components/Form.svelte'
  import ItemListNav from '../components/ItemListNav.svelte'
  import project from '../stores/active-project-store'
  import FieldArtPicker from '../components/FieldArtPicker.svelte'
  import FieldCheckbox from '../components/FieldCheckbox.svelte'
  import FieldParticles from '../components/FieldParticles.svelte'
  import FieldText from '../components/FieldText.svelte'
  import FieldNumber from '../components/FieldNumber.svelte'
  import FieldCharacterPicker from '../components/FieldCharacterPicker.svelte'
  import FieldEnemyPicker from '../components/FieldEnemyPicker.svelte'
  import validator from '../services/validator'
  import { getNextId } from '../stores/project-store'
  import { push } from 'svelte-spa-router'

  export let params = {}
  let input = createDefaultInput()

  $: paramId = decodeURIComponent(params.id) || 'new'
  $: paramId == 'new' ? create() : edit(paramId)
  $: isAdding = input.id == null
  $: hasChanges = input != null && !validator.equals(input, $project.blocks[input.id])

  function createDefaultInput() {
    return {
      name: '',
      canWalk: true,
      canSee: true,
      throwOnTouch: false,
      teleportOnTouch: false,
      flipGravityOnTouch: false,
      winOnTouch: false,
      damage: 0,
      consumable: false,
      healthOnConsume: 0,
      scoreOnConsume: 0,
      followerOnConsume: [],
      enemyOnConsume: [],
      particles: null,
    }
  }

  function create() {
    input = createDefaultInput()
  }

  function edit(name) {
    if (!$project.blocks.hasOwnProperty(name)) return
    input = {
      ...createDefaultInput(),
      ...JSON.parse(JSON.stringify($project.blocks[name])),
    }
  }

  function save() {
    if (validator.empty(input.name)) {
      document.getElementById('name').focus()
      return
    }
    if (isAdding) input.id = getNextId($project.blocks)
    $project.blocks[input.id] = JSON.parse(JSON.stringify(input))
    push(`/blocks/${encodeURIComponent(input.id)}`)
  }

  function del() {
    if (confirm(`Are you sure you want to delete "${input.name}"?`)) {
      delete $project.blocks[input.id]
      $project.blocks = $project.blocks
      push(`/blocks/new`)
    }
  }
</script>
