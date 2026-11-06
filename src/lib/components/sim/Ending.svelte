<script>
	// @ts-nocheck
	import { endingRows } from '$lib/game/sim/hud.js';
	import { defaultData } from '$lib/game/sim/data/index.js';
	import { formatStat } from '$lib/game/sim/format.js';
	import ShareButton from './ShareButton.svelte';

	let { run, summary, onRunAgain, changeHref, inputs, runId = null } = $props();

	const rows = $derived(endingRows(run, defaultData.national, summary));
	const show = (row, v) => (typeof v === 'number' && row.key ? formatStat(row.key, v) : (v ?? '—'));
	const btn = 'border-2 border-black px-4 py-2 font-black uppercase shadow-[4px_4px_0_0_#000]';
</script>

<section class="absolute inset-0 z-20 overflow-y-auto bg-black/50 p-4 text-black md:p-10" aria-labelledby="ending-title">
	<div class="mx-auto max-w-3xl border-4 border-black bg-white p-5 shadow-[6px_6px_0_0_#000] md:p-8">
		<p class="text-xs font-black tracking-[0.2em] uppercase opacity-60">The Timeline</p>
		<h1 id="ending-title" class="text-3xl font-black uppercase md:text-5xl">Their Nigeria in {run.history.at(-1).year}</h1>
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
		{#if !summary}<p class="mt-3 text-sm text-black/60" aria-live="polite">Running 50 more versions of this world…</p>{/if}
		<div class="mt-6 flex flex-wrap gap-3">
			<button type="button" class="{btn} bg-emerald-400" onclick={onRunAgain}>Run again</button>
			<a href={changeHref} class="{btn} bg-white">Change switches</a>
			<ShareButton {inputs} {summary} {runId} class="{btn} bg-amber-300" />
		</div>
	</div>
</section>
