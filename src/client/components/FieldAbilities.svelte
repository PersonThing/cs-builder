<div class="form-group">
	<label>
		<slot />
	</label>
	<div class="card bg-light mb-2">
		<div class="card-body">
			<table class="table">
				<thead>
					<tr>
						<th />
						{#if requireKeybinds}
							<th>Key</th>
						{/if}
						<th>Range</th>
						<th>Name</th>
						<th>Character graphic</th>
						<th>Damage per hit</th>
						<th>Damage blocks on hit</th>
						<th>Attack rate (MS)</th>
						<th>Projectile?</th>
						<th>Projectile Graphics</th>
						<th>Projectile Velocity</th>
						<th>Projectile pass through blocks?</th>
					</tr>
				</thead>

				<tbody>
					{#each abilities as a, i}
						<tr>
							<td>
								<button type="button" class="btn btn-danger" on:click={() => removeAbility(i)}>
									<Icon data={removeIcon} />
								</button>
							</td>
							{#if requireKeybinds}
								<td>
									<InputSelect name="ability-key-{i}" inline options={availableKeys} let:option bind:value={a.key}>{option.value}</InputSelect>
								</td>
							{/if}
							<td>
								<input type="number" min={0} max={10000} bind:value={a.range} />
							</td>
							<td>
								<input type="text" bind:value={a.name} />
							</td>
							<td>
								<FieldArtPicker name="ability-graphics-character-{i}" bind:value={a.graphics.character} placeholder="Character graphic" />
							</td>
							<td>
								<input type="number" bind:value={a.damage} />
							</td>
							<td>
								<input type="checkbox" bind:checked={a.damageBlocksOnHit} />
							</td>
							<td>
								<input type="number" bind:value={a.attackRateMs} min={0} max={120000} />
							</td>
							<td>
								<input type="checkbox" bind:checked={a.projectile} />
							</td>
							{#if a.projectile}
								<td>
									<FieldArtPicker name="ability-graphics-projectile-{i}" bind:value={a.graphics.projectile} placeholder="Projectile graphic" />
									<ParticlesPicker name="ability-{i}-particles" bind:value={a.particles} />
								</td>
								<td>
									<input type="number" bind:value={a.projectileVelocity} min={0} max={10000} />
								</td>
								<td>
									<input type="checkbox" bind:checked={a.projectilePassThroughBlocks} />
								</td>
							{:else}
								<td colspan="2" />
							{/if}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
	<div>
		<button on:click={addAbility} class="btn btn-success btn-sm" type="button">
			<Icon data={plusIcon} />
			Add ability
		</button>
	</div>
</div>

<script>
	import { plus as plusIcon, remove as removeIcon } from 'svelte-awesome/icons'
	import FieldArtPicker from './FieldArtPicker.svelte'
	import ParticlesPicker from './ParticlesPicker.svelte'
	import Icon from 'svelte-awesome'
	import InputSelect from './InputSelect.svelte'

	export let abilities = []
	export let requireKeybinds = true // whether to show key bind field

	const availableKeys = ['Q', 'W', 'E', 'R', 'S', 'F', 'T']

	function addAbility() {
		abilities = abilities.concat(createDefaultAbility())
	}

	function removeAbility(i) {
		abilities.splice(i, 1)
		abilities = abilities
	}

	function createDefaultAbility() {
		return {
			name: '',
			key: 'R',
			range: 400,
			damage: 50,
			attackRateMs: 500,
			projectile: false,
			projectileVelocity: 500,
			projectilePassThroughBlocks: false,
			damageBlocksOnHit: false,

			graphics: {
				character: null,
				projectile: null,
			},

			particles: null
		}
	}
</script>

<style lang="scss">
	.table {
		thead th {
			border-top: none;
		}
	}
</style>
