<script>
	// @ts-nocheck
	import DioramaCanvas from './DioramaCanvas.svelte';
	import { frameAt } from '$lib/game/sim/frame.js';
	import { realFrame, statsAt, captionsAt } from '$lib/game/sim/hud.js';
	import { WIDE } from '$lib/game/sim/camera.js';
	import { defaultData } from '$lib/game/sim/data/index.js';
	import { formatStat } from '$lib/game/sim/format.js';

	/** endOfYear: draw the map and numbers as the year ends, after its events (key-year pauses). */
	let { run, year, endOfYear = false, onContinue = null } = $props();

	const yearInt = $derived(Math.floor(year));
	const at = $derived(endOfYear ? yearInt + 1 : yearInt);
	const theirs = $derived(frameAt(run, at));
	const ours = $derived(realFrame(at));
	const stats = $derived(statsAt(run, defaultData.national, at));
	const caps = $derived(captionsAt(run, yearInt + 0.99, 1));
	const theirCaption = $derived(caps.find((c) => c.title)?.title ?? 'No major events this year.');
	const ourCaption = $derived(caps.find((c) => c.ours)?.ours.replace('In our world: ', '') ?? null);
</script>

<section class="absolute inset-0 z-10 grid grid-rows-2 bg-[#0e1116] text-[#f2efe6] md:grid-cols-2 md:grid-rows-1" aria-label="Two Nigerias in {yearInt}">
	{#each [['OUR WORLD', ours, 'ours', ourCaption], ['THEIR WORLD', theirs, 'value', theirCaption]] as [title, frame, key, caption], i (title)}
		<div class="relative flex flex-col border-white/20 {i === 0 ? 'border-b md:border-r md:border-b-0' : ''}">
			<p class="pt-3 text-center text-xs font-black tracking-[0.2em] {i ? 'text-amber-400' : 'opacity-70'}">{title}</p>
			<div class="min-h-0 flex-1"><DioramaCanvas {frame} camera={WIDE} popLabels label="{title} map in {yearInt}" /></div>
			<div class="grid grid-cols-4 gap-2 px-4 pb-2 text-center">
				{#each stats as s (s.key)}
					<div>
						<p class="text-[10px] font-black tracking-wider uppercase opacity-60">{s.label}</p>
						<p class="font-bold tabular-nums">{formatStat(s.key, s[key])}</p>
					</div>
				{/each}
			</div>
			<p class="min-h-10 px-4 pb-3 font-serif text-sm opacity-90">{caption ?? 'As history.'}</p>
		</div>
	{/each}

	<div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border border-white/40 bg-[#0e1116] px-3 py-1 font-serif text-3xl font-bold">
		{endOfYear ? `End of ${yearInt}` : yearInt}
	</div>
	<p class="pointer-events-none absolute top-8 left-1/2 hidden -translate-x-1/2 text-[11px] opacity-60 md:block">
		Each figure is the number of people in that state; each tower is its towns: taller means more people live in towns there.
	</p>
	{#if onContinue}
		<button
			type="button"
			class="absolute top-3 right-3 border-2 border-black bg-amber-300 px-3 py-1 text-xs font-black text-black uppercase shadow-[3px_3px_0_0_#000]"
			onclick={onContinue}>Continue</button
		>
	{/if}
</section>
