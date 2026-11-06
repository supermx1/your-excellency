<script>
	// @ts-nocheck
	import { formatStat } from '$lib/game/sim/format.js';

	/** place: placeAt(...). Without onClose it's the small hover label; with it, the pinned card. */
	let { place, onClose = null } = $props();
	const pct = (v) => `${Math.round(v * 100)}%`;
</script>

{#if !onClose}
	<p class="font-black">{place.name}</p>
	<p class="text-xs font-medium opacity-70">{place.today}</p>
	{#if place.ours}<p class="mt-1 text-xs italic opacity-70">{place.ours}</p>{/if}
{:else}
	<section aria-label="About {place.name}" class="border-2 border-black bg-white p-3 text-black shadow-[4px_4px_0_0_#000]">
		<div class="flex items-start justify-between gap-3">
			<div>
				<h2 class="leading-tight font-black uppercase">{place.name}</h2>
				<p class="text-xs font-medium text-black/60">{place.today}</p>
				{#if place.ours}<p class="mt-1 text-xs italic text-black/60">{place.ours}</p>{/if}
			</div>
			<button type="button" class="border-2 border-black px-2 text-sm font-black" aria-label="Close" onclick={onClose}>×</button>
		</div>
		<dl class="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
			<dt class="font-bold">Population</dt>
			<dd class="tabular-nums">{formatStat('pop', place.pop)}</dd>
			<dt class="font-bold">Can read</dt>
			<dd class="tabular-nums">{formatStat('litAny', place.litAny)}</dd>
			<dt class="font-bold">States</dt>
			<dd class="tabular-nums">{place.cellIds.length}</dd>
		</dl>
		<p class="mt-2 text-xs">
			{pct(place.religion.islam)} Muslim · {pct(place.religion.christian)} Christian · {pct(place.religion.traditional)} traditional
		</p>
		{#if place.why?.length}
			<h3 class="mt-2 text-xs font-black uppercase">What's happening here</h3>
			<ul class="mt-1 space-y-0.5 text-xs" data-why>
				{#each place.why as line (line.kind)}<li>· {line.text}</li>{/each}
			</ul>
		{/if}
		{#if place.atWarWith.length}
			<p class="mt-2 text-xs font-bold text-red-700">At war with {place.atWarWith.join(', ')}</p>
		{/if}
	</section>
{/if}
