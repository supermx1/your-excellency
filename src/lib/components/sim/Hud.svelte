<script>
	// @ts-nocheck
	import { formatStat } from '$lib/game/sim/format.js';

	let { year, stats, caption, label = '' } = $props();
</script>

<div class="pointer-events-none absolute inset-0 text-[#f2efe6]">
	<div class="absolute top-3 right-3 left-3 text-right md:left-auto md:top-6 md:right-8">
		{#if label}<p class="text-xs font-black tracking-[0.2em] uppercase opacity-70">{label}</p>{/if}
		<p data-testid="year" class="font-serif text-5xl leading-none font-bold tabular-nums md:text-7xl">{Math.floor(year)}</p>
		<!-- Phones: every figure in three tight columns. A dark backing keeps white text readable over a bright map. -->
		<dl class="mt-2 grid grid-cols-3 gap-x-3 gap-y-1.5 bg-black/60 p-2 text-left md:mt-3 md:grid-cols-2 md:gap-x-6 md:gap-y-2 md:p-3">
			{#each stats as s (s.key)}
				<div>
					<dt class="text-[9px] leading-tight font-black tracking-[0.1em] uppercase opacity-70 md:text-[10px] md:tracking-[0.15em]">{s.label}</dt>
					<dd class="text-sm font-bold tabular-nums md:text-xl">{formatStat(s.key, s.value)}</dd>
					{#if s.extra}<dd class="text-[10px] leading-tight font-bold md:text-xs">{s.extra}</dd>{/if}
					<dd class="text-[10px] opacity-60 md:text-xs">ours: {formatStat(s.key, s.ours)}</dd>
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
