<script>
	// @ts-nocheck
	let { narration } = $props();
	let open = $state(false);
</script>

<aside
	class="absolute right-4 bottom-56 left-4 max-w-lg bg-black/75 px-3 py-2 font-serif text-sm text-[#f2efe6] shadow-[0_8px_20px_rgba(0,0,0,0.5)] md:right-auto md:bottom-40 md:left-8 md:text-base"
	aria-label="Narration"
>
	<p data-testid="narration" aria-live="polite" class={open ? '' : 'line-clamp-3'}>{narration.text}</p>
	{#if open}
		{#each narration.vignettes as v, i (i)}<p class="mt-2 text-sm italic opacity-80">{v}</p>{/each}
	{/if}
	<button type="button" class="mt-1 text-xs font-black tracking-wider text-amber-300 uppercase" aria-expanded={open} onclick={() => (open = !open)}>
		{open ? 'Less' : 'More'}
	</button>
</aside>
