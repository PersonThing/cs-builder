<div class="form-group">
	<label for="level">
		<slot>Levels</slot>
	</label>
	<div>
		<InputSelect multiple {options} bind:value let:option inline filterable={options.length > 2} {placeholder}>
			{option.name}
			<img src={option.thumbnail} height="40" />
		</InputSelect>
	</div>
</div>

<script>
	import { sortByName } from '../services/object-utils'
	import project from '../stores/active-project-store'
	import InputSelect from './InputSelect.svelte'
	export let value = []
	export let placeholder = null

	$: options = Object.values($project.levels)
		.map(l => ({
			...l,
			value: l.id
		}))
		.sort(sortByName)
</script>
