<script>
	// @ts-nocheck
	// Everything drawn over the map in an exported video, from one scene (export.js sceneAt).
	import Hud from '$lib/components/sim/Hud.svelte';
	import FamilyCard from '$lib/components/sim/FamilyCard.svelte';
	import { formatStat } from '$lib/game/sim/format.js';

	let { scene, card, label, startYear, endYear } = $props();

	const show = (row, v) => (typeof v === 'number' && row.key ? formatStat(row.key, v) : (v ?? '—'));
	const panel = 'w-[1400px] border-4 border-black bg-white p-12 text-black shadow-[8px_8px_0_0_#000]';
	const kicker = 'text-xl font-black tracking-[0.2em] uppercase opacity-60';
</script>

{#snippet subtitle(top)}
	{#if scene.subtitle}
		<div class="absolute left-1/2 w-[840px] -translate-x-1/2 text-center {top ? 'top-[57%]' : 'bottom-10'}">
			<p class="inline-block bg-black px-3 py-1 text-xl font-black tracking-[0.15em] text-amber-300 uppercase">{scene.subtitle.kicker}</p>
			{#if scene.subtitle.text}
				<p class="mt-2 border-4 border-black bg-amber-300 px-6 py-3 text-4xl leading-tight font-black text-black uppercase shadow-[6px_6px_0_0_#000]">
					{scene.subtitle.text}
				</p>
			{/if}
		</div>
	{/if}
{/snippet}

{#if scene?.phase === 'title'}
	<section class="absolute inset-0 flex flex-col items-center justify-center bg-[#0e1116]/85 px-40 text-center text-[#f2efe6]">
		<p class="text-2xl font-black tracking-[0.3em] uppercase opacity-70">The Timeline · a simulation of Nigeria</p>
		<h1 class="mt-8 border-4 border-black bg-amber-300 px-10 py-4 text-8xl font-black text-black uppercase shadow-[8px_8px_0_0_#000]">{card.label}</h1>
		{#if card.description}<p class="mt-10 max-w-[1300px] font-serif text-5xl leading-tight">{card.description}</p>{/if}
		<p class="mt-8 text-5xl font-black tabular-nums">{card.from} → {card.to}</p>
		{#if card.changes.length}
			<p class="mt-10 text-xl font-black tracking-[0.2em] uppercase opacity-60">Changed from history</p>
			<div class="mt-3 flex flex-wrap justify-center gap-4">
				{#each card.changes as c (c.label)}<span class="border-2 border-white/50 px-4 py-2 text-3xl font-bold">{c.label}: {c.value}</span>{/each}
			</div>
		{:else}
			<p class="mt-10 text-3xl font-bold">Every switch as in history.</p>
		{/if}
		<p class="mt-12 text-2xl opacity-60">One run of the model. Another roll of the dice tells another story.</p>
	</section>
{:else if scene?.phase === 'split'}
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
		{@render subtitle(true)}
	</div>
{:else if scene?.phase === 'ending'}
	<section class="absolute inset-0 flex items-center justify-center bg-black/60 p-16">
		<div class={panel}>
			<p class={kicker}>The Timeline · {label}</p>
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
							<td class="py-2 pr-3 font-bold">{show(row, row.theirs)}{#if row.like?.theirs}<span class="block text-sm font-medium opacity-70">{row.like.theirs}</span>{/if}</td>
							<td class="py-2 text-black/70">{show(row, row.ours)}{#if row.like?.ours}<span class="block text-sm">{row.like.ours}</span>{/if}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>
{:else if scene?.phase === 'range'}
	<section class="absolute inset-0 flex items-center justify-center bg-black/60 p-16">
		<div class={panel}>
			<p class={kicker}>The Timeline · {label}</p>
			<h1 class="text-6xl font-black uppercase">How different could it turn out?</h1>
			<p class="mt-4 text-3xl">The same switches, {scene.ranges.runs} other random seeds, all ending in {scene.ranges.endYear}.</p>
			<table class="mt-8 w-full border-collapse text-left text-3xl tabular-nums">
				<thead>
					<tr class="border-b-4 border-black text-xl font-black uppercase">
						<th class="py-2 pr-3">Outcome</th>
						<th class="py-2 pr-3">Median</th>
						<th class="py-2">Middle 80% of runs</th>
					</tr>
				</thead>
				<tbody>
					{#each scene.ranges.rows as row (row.key)}
						<tr class="border-b-2 border-black/20">
							<th class="py-2 pr-3 text-2xl font-black uppercase">{row.label}</th>
							<td class="py-2 pr-3 font-bold">{formatStat(row.key, row.median)}</td>
							<td class="py-2">{formatStat(row.key, row.p10)}–{formatStat(row.key, row.p90)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
			<p class="mt-6 text-2xl text-black/60">Random variation under the same model assumptions. Not a forecast.</p>
		</div>
	</section>
{:else if scene?.phase === 'shaped'}
	<section class="absolute inset-0 flex items-center justify-center bg-black/60 p-16">
		<div class={panel}>
			<p class={kicker}>The Timeline · {label}</p>
			<h1 class="text-6xl font-black uppercase">What shaped this world?</h1>
			<p class="mt-4 text-3xl">
				In {scene.shaped.name}, where most people live in towns, people earn about
				<b class="tabular-nums">${Math.round(scene.shaped.income).toLocaleString('en-US')}</b> a person a year in {scene.shaped.year}.
			</p>
			<ul class="mt-6 divide-y-2 divide-black/15 border-y-4 border-black">
				{#each scene.shaped.drivers as d (d.key)}
					<li class="flex items-baseline justify-between gap-6 py-3 text-2xl">
						<p><b>{d.label}.</b> {d.description}</p>
						<span class="shrink-0 font-bold tabular-nums {d.effect === 'no effect' ? 'text-black/40' : d.multiplier > 1 ? 'text-emerald-700' : 'text-red-700'}">{d.effect}</span>
					</li>
				{/each}
			</ul>
			<p class="mt-8 text-3xl font-black">Make your own what-if: yx.techgfxlimited.com/sim</p>
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
			<div class="absolute right-6 bottom-6 flex w-60 flex-col gap-2">
				{#each scene.families as family (family.key)}<FamilyCard card={family} />{/each}
			</div>
		</div>
		{@render subtitle(false)}
	{/if}
{/if}
