<script>
	// @ts-nocheck
	import { endingRows } from '$lib/game/sim/hud.js';
	import { defaultData } from '$lib/game/sim/data/index.js';
	import { formatStat } from '$lib/game/sim/format.js';
	import ShareButton from './ShareButton.svelte';
	import FeatureButton from './FeatureButton.svelte';
	import RunInsights from './RunInsights.svelte';

	let { run, summary, onRunAgain, changeHref, inputs, runId = null } = $props();

	const rows = $derived(endingRows(run, defaultData.national, summary));
	const show = (row, v) => (typeof v === 'number' && row.key ? formatStat(row.key, v) : (v ?? '—'));
	let open = $state(true); // minimized: the maps stay visible and the scorecard sits in a small bar
	const btn = 'border-2 border-black px-4 py-2 font-black uppercase shadow-[4px_4px_0_0_#000]';
</script>

{#if open}<section
	class="absolute inset-0 z-20 overflow-y-auto bg-black/50 p-4 text-black md:p-10"
	aria-labelledby="ending-title"
>
	<div
		class="relative mx-auto max-w-3xl border-4 border-black bg-white p-5 shadow-[6px_6px_0_0_#000] md:p-8"
	>
		<button
			type="button"
			class="absolute top-3 right-3 z-10 border-2 border-black bg-white px-3 py-1 text-xs font-black uppercase shadow-[3px_3px_0_0_#000] md:top-5 md:right-5"
			aria-expanded="true"
			onclick={() => (open = false)}>Minimize ▾</button
		>
		<p class="text-xs font-black tracking-[0.2em] uppercase opacity-60">The Timeline</p>
		<h1 id="ending-title" class="text-3xl font-black uppercase md:text-5xl">
			Their Nigeria in {run.history.at(-1).year}
		</h1>
		<table class="mt-6 w-full border-collapse text-left">
			<thead>
				<tr class="border-b-4 border-black text-xs font-black uppercase">
					<th class="py-2 pr-3"></th>
					<th class="py-2 pr-3">Theirs</th>
					<th class="py-2">Ours</th>
				</tr>
			</thead>
			<tbody>
				{#each rows as row (row.label)}
					<tr class="border-b-2 border-black/20 align-top">
						<th class="py-2 pr-3 text-sm font-black uppercase">{row.label}</th>
						<td class="py-2 pr-3 font-bold">{show(row, row.theirs)}</td>
						<td class="py-2 text-black/70">{show(row, row.ours)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
		{#if !summary}<p class="mt-3 text-sm text-black/60" aria-live="polite">
				Running 50 more versions of this world…
			</p>{/if}
		<RunInsights {run} {summary} />
		<div class="mt-6 flex flex-wrap gap-3">
			<button type="button" class="{btn} bg-emerald-400" onclick={onRunAgain}>Run again</button>
			<a href={changeHref} class="{btn} bg-white">Change switches</a>
			<ShareButton {inputs} {summary} {runId} class="{btn} bg-amber-300" />
			<FeatureButton {run} {inputs} {summary} {runId} class="{btn} bg-black text-white" />
		</div>
	</div>
</section>
{:else}
	<button
		type="button"
		class="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap md:top-1/2 md:bottom-auto md:mt-10 {btn} bg-white text-sm text-black"
		aria-expanded="false"
		onclick={() => (open = true)}>Their Nigeria in {run.history.at(-1).year} · Show scorecard ▴</button
	>
{/if}
