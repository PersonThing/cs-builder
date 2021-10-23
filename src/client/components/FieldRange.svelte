<div class="form-group">
	<label for={name}>
		<slot />
	</label>
	<input {name} id={name} type="range" bind:value {min} {max} {step} class="form-control" />
</div>

<script>
	export let value = null
	export let name = 'num'
	export let min = null
	export let max = null
	export let step = 1
</script>
