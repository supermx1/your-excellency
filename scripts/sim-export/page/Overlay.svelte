<script>
	// @ts-nocheck
	// Everything drawn over the map in an exported video, from one scene (export.js sceneAt).
	import Hud from '$lib/components/sim/Hud.svelte';
	import FamilyCard from '$lib/components/sim/FamilyCard.svelte';
	import { formatStat } from '$lib/game/sim/format.js';

	let { scene, label, startYear, endYear } = $props();

	const show = (row, v) => (typeof v === 'number' && row.key ? formatStat(row.key, v) : (v ?? '—'));
</script>

{#if scene?.phase === 'split'}
	<div class="absolute inset-0 text-[#f2efe6]">
		{#each [['OUR WORLD', 'ours', scene.caption?.ours], ['THEIR WORLD', 'value', scene.caption?.title]] as [title, key, caption], i (title)}
			<div class="absolute top-0 bottom-0 flex w-1/2 flex-col justify-between {i ? 'left-1/2' : 'left-0 border-r border-white/20'}">
				<p class="pt-8 text-center text-3xl font-black tracking-[0.2em] {i ? 'text-amber-400' : 'opacity-70'}">{title}</p>
				<div class="bg-[#0e1116]/80 px-10 pt-4 pb-8">
					<div class="grid grid-cols-4 gap-4 text-center">
						{#each scene.stats as s (s.key)}
							<div>
								<p class="text-base font-black tracking-wider uppercase opacity-60">{s.label}</p>
								<p class="text-4xl font-bold tabular-nums">{formatStat(s.key, s[key])}</p>
							</div>
						{/each}
					</div>
					<p class="mt-4 min-h-10 font-serif text-3xl opacity-90">{(caption ?? 'As history.').replace('In our world: ', '')}</p>
				</div>
			</div>
		{/each}
		<p class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border border-white/40 bg-[#0e1116] px-5 py-2 font-serif text-6xl font-bold">
			End of {scene.year}
		</p>
	</div>
{:else if scene?.phase === 'ending'}
	<section class="absolute inset-0 flex items-center justify-center bg-black/60 p-16">
		<div class="w-[1400px] border-4 border-black bg-white p-12 text-black shadow-[8px_8px_0_0_#000]">
			<p class="text-xl font-black tracking-[0.2em] uppercase opacity-60">The Timeline · {label}</p>
			<h1 class="text-6xl font-black uppercase">Their Nigeria in {endYear}</h1>
			<table class="mt-8 w-full border-collapse text-left text-3xl">
				<thead>
					<tr class="border-b-4 border-black text-xl font-black uppercase">
						<th class="py-2 pr-3"></th>
						<th class="py-2 pr-3">Theirs</th>
						<th class="py-2">Ours</th>
					</tr>
				</thead>
				<tbody>
					{#each scene.ending as row (row.label)}
						<tr class="border-b-2 border-black/20 align-top">
							<th class="py-2 pr-3 text-2xl font-black uppercase">{row.label}</th>
							<td class="py-2 pr-3 font-bold">{show(row, row.theirs)}</td>
							<td class="py-2 text-black/70">{show(row, row.ours)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>
{:else if scene}
	{#if scene.camera.title > 0}
		<div class="absolute inset-0 bottom-14 flex flex-col items-center justify-center text-[#f2efe6]" style:opacity={scene.camera.title}>
			<p class="font-serif text-9xl font-black">{startYear}</p>
			<p class="mt-4 text-3xl font-black tracking-[0.3em] uppercase">{label}</p>
		</div>
	{/if}
	{#if scene.camera.mode !== 'globe'}
		<!-- The live site's desktop sizes read small on a 1080p video, so the HUD is drawn at half size and doubled. -->
		<div class="absolute top-0 left-0" style="zoom: 2; width: 960px; height: 540px">
			<Hud year={scene.year} stats={scene.stats} caption={scene.caption} {label} />
			<div class="absolute right-6 bottom-6 flex flex-col gap-2">
				{#each scene.families as card (card.key)}<FamilyCard {card} />{/each}
			</div>
		</div>
	{/if}
{/if}
