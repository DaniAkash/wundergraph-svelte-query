<script lang="ts">
	import { createQuery } from '../lib/svelte-query-utils/svelteQueryUtils';

	const query = createQuery({
		operationName: "Starwars",
	})
</script>

<div class="counter">
	<h1>Simple Query</h1>
	<div>
		{#if $query.isLoading}
			Loading...
		{/if}
		{#if $query.error}
			An error has occurred:
			{$query.error.message}
		{/if}
		{#if $query.isSuccess}
      <div>
        <pre>{JSON.stringify($query.data.starwars_allPeople)}</pre>
      </div>
    {/if}
	</div>
</div>
