<script>
	// @ts-nocheck
	import { formatStat } from '$lib/game/sim/format.js';

	let { year, stats, caption, label = '' } = $props();
</script>

<div class="pointer-events-none absolute inset-0 text-[#f2efe6]">
	<div class="absolute top-3 right-4 text-right md:top-6 md:right-8">
		{#if label}<p class="text-xs font-black tracking-[0.2em] uppercase opacity-70">{label}</p>{/if}
		<p data-testid="year" class="font-serif text-5xl leading-none font-bold tabular-nums md:text-7xl">{Math.floor(year)}</p>
		<dl class="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-left">
			{#each stats as s, i (s.key)}
				<div class={i > 1 ? 'hidden md:block' : ''}>
					<dt class="text-[10px] font-black tracking-[0.15em] uppercase opacity-60">{s.label}</dt>
					<dd class="text-lg font-bold tabular-nums md:text-xl">{formatStat(s.key, s.value)}</dd>
					<dd class="text-xs opacity-60">ours: {formatStat(s.key, s.ours)}</dd>
				</div>
			{/each}
		</dl>
	</div>

	{#if caption}
		<div
			class="absolute right-4 bottom-20 left-4 max-w-xl border-l-4 border-amber-400 bg-black/70 px-3 py-2 font-serif text-sm md:right-auto md:bottom-24 md:left-8 md:text-base"
			aria-live="polite"
		>
			{#if caption.title}<p><b>{Math.floor(caption.year)}.</b> {caption.title}</p>{/if}
			{#if caption.ours}<p class="opacity-70">{caption.ours}</p>{/if}
		</div>
	{/if}
</div>
