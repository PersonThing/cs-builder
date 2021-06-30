<div class="form-group">
	<div class="form-check">
		<input {name} id={name} type="checkbox" class="form-check-input" bind:checked />
		<label class="form-check-label" for={name}>
			<slot />
		</label>
	</div>
</div>

<script>
	export let checked = null
	export let name = 'check'
</script>
