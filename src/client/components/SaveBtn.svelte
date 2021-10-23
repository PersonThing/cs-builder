<button type="submit" class="btn btn-{disabled ? 'disabled' : 'success'}" class:disabled>
	<slot>Save</slot>
</button>

<script>
	export let disabled = false
</script>
