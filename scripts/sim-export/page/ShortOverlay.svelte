<script>
	// @ts-nocheck
	// Everything over the map in a Short (1080×1350). Text stays in the top three quarters: in the final
	// 9:16 video YouTube's title and buttons cover the bottom.
	import { formatStat } from '$lib/game/sim/format.js';

	let { scene, label } = $props();

	const show = (row, v) => (typeof v === 'number' && row.key ? formatStat(row.key, v) : (v ?? '—'));
	const NAMES = { pop: 'People', wars: 'Wars' };
</script>

{#snippet caption(kicker)}
	{#if scene.line || kicker}
		<div class="mx-auto w-[960px] text-center">
			{#if kicker}<p class="inline-block bg-black px-4 py-1 text-3xl font-black tracking-[0.15em] text-amber-300 uppercase">{kicker}</p>{/if}
			{#if scene.line}
				<p class="mt-3 border-4 border-black bg-amber-300 px-6 py-4 text-[54px] leading-[1.1] font-black text-black uppercase shadow-[8px_8px_0_0_#000]">
					{scene.line}
				</p>
			{/if}
		</div>
	{/if}
{/snippet}

{#if scene?.phase === 'town'}
	<div class="absolute inset-0 text-[#2c2930]">
		<div class="absolute inset-x-[52px] top-[48px]">
			<div class="inline-flex items-center gap-5 border-4 border-[#2c2930] bg-[#2c2930] px-5 py-2 font-mono text-[29px] font-bold tracking-[0.12em] text-[#f4d896] uppercase">
				<span>Illustrated cutaway</span>
				<span class="border-l-2 border-[#f4d896] pl-5">{scene.town.year}</span>
			</div>
			<p class="w-fit max-w-full border-4 border-[#2c2930] bg-[#f4e4bb] px-6 py-3 text-[49px] leading-[1.08] font-black tracking-tight shadow-[7px_7px_0_0_#2c2930]">
				{scene.town.title}
			</p>
		</div>
		<div class="absolute inset-x-0 bottom-[105px]">{@render caption(null)}</div>
	</div>
{:else if scene?.phase === 'split'}
	<div class="absolute inset-0 text-[#f2efe6]">
		<div class="absolute inset-x-0 top-8">{@render caption(null)}</div>
		<div class="absolute top-1/2 right-0 left-0 border-t-4 border-white/40"></div>
		<p class="absolute bottom-[calc(50%+16px)] left-8 text-3xl font-black tracking-[0.2em] [text-shadow:0_2px_8px_rgba(0,0,0,0.9)]">OUR WORLD</p>
		<p class="absolute top-[calc(50%+16px)] left-8 text-3xl font-black tracking-[0.2em] text-amber-400 [text-shadow:0_2px_8px_rgba(0,0,0,0.9)]">THEIR WORLD</p>
		<p class="absolute top-1/2 right-8 -translate-y-1/2 bg-black px-4 py-1 text-3xl font-black tracking-[0.15em] text-amber-300 uppercase">{scene.kicker}</p>
	</div>
{:else if scene}
	<div class="absolute inset-x-0 top-0 px-8 pt-8 text-[#f2efe6]">
		<div class="flex items-start justify-between">
			<p class="mt-4 border-4 border-black bg-amber-300 px-4 py-1 text-4xl font-black text-black uppercase shadow-[6px_6px_0_0_#000]">{label}</p>
			<p class="font-serif text-[150px] leading-none font-bold tabular-nums [text-shadow:0_4px_16px_rgba(0,0,0,0.8)]">{scene.year}</p>
		</div>
		<div class="mt-4 flex gap-4">
			{#each scene.stats as s (s.key)}
				<div class="bg-black/70 px-5 py-3">
					<p class="text-[28px] font-black tracking-[0.15em] uppercase opacity-70">{NAMES[s.key]}</p>
					<p class="text-5xl font-bold tabular-nums">{formatStat(s.key, s.value)}</p>
					<p class="text-[28px] opacity-70 tabular-nums">ours: {formatStat(s.key, s.ours)}</p>
				</div>
			{/each}
		</div>
		<div class="mt-8">{@render caption(null)}</div>
	</div>
	{#if scene.phase === 'card'}
		<div class="absolute inset-x-8 top-[600px] border-4 border-black bg-white p-8 text-black shadow-[8px_8px_0_0_#000]">
			<table class="w-full border-collapse text-left text-4xl">
				<thead>
					<tr class="border-b-4 border-black text-[28px] font-black uppercase">
						<th class="py-2"></th>
						<th class="py-2">Theirs</th>
						<th class="py-2">Ours</th>
					</tr>
				</thead>
				<tbody>
					{#each scene.card.rows as row (row.label)}
						<tr class="border-b-2 border-black/20">
							<th class="py-3 pr-3 text-3xl font-black uppercase">{row.label}</th>
							<td class="py-3 pr-3 font-bold">{show(row, row.theirs)}</td>
							<td class="py-3 text-black/70">{show(row, row.ours)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
			{#if scene.card.runs}<p class="mt-4 text-3xl font-black">{scene.card.runs.label}: {scene.card.runs.theirs}</p>{/if}
		</div>
	{/if}
{/if}
