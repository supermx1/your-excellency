<script>
	// @ts-nocheck
	import { defaultRulebook } from '$lib/game/engine.js';

	let { run, pastRuns } = $props();

	function naira(value) {
		const abs = Math.abs(value);
		const text =
			abs >= 1_000_000_000
				? `₦${(abs / 1_000_000_000).toFixed(1)}bn`
				: `₦${Math.round(abs / 1_000_000)}m`;
		return value < 0 ? `+${text}` : text;
	}

	const card = 'border-4 border-black bg-white shadow-[6px_6px_0_0_#000]';
</script>

<aside class="space-y-5">
	<details class="{card} p-4" open={!run}>
		<summary class="cursor-pointer font-black uppercase">How to play</summary>
		<ol class="mt-3 list-decimal space-y-2 pl-5 text-sm font-medium">
			<li><strong>Create your candidate</strong> — join a party or found your own.</li>
			<li>
				<strong>Campaign for 6 weeks.</strong> Each week you get 5 action points. Tap a state on the map,
				pick an action, and choose how much to spend — small, medium or large. Green actions build real
				support. The red one pays fast, but EFCC go dey watch you.
			</li>
			<li>
				<strong>Election day:</strong> run clean, push turnout, or rig — rigging fit land you for tribunal.
			</li>
			<li><strong>If you win,</strong> announce one policy and see how Nigerians react.</li>
			<li>
				<strong>Survive the tribunal.</strong> Your Legacy decides the ending — money counts for nothing,
				and even a clean loss seeds your next run.
			</li>
		</ol>
	</details>

	{#if run}
		<section class="{card} p-4">
			<p class="text-xs font-black uppercase text-zinc-500">Candidate</p>
			<h2 class="text-xl font-black">{run.playerName}</h2>
			<p class="text-sm font-medium">{run.party} · {run.state.role}</p>
		</section>

		<section class="{card} p-4">
			<h2 class="font-black uppercase">War chest</h2>
			<p class="mt-1 text-2xl font-black">{naira(run.naira)}</p>
			<p class="text-xs font-medium">Supporters donate every week — more popularity, more money.</p>
			<div class="mt-3 grid gap-2 text-sm">
				{@render meterRow('Week', `${run.week}/${defaultRulebook.params.campaignWeeks}`)}
				{@render meterRow('Actions left', run.ap)}
				{@render meterRow('Popularity', run.popularity)}
				{@render meterRow('Connections', run.connections)}
				{@render meterRow('EFCC risk', run.efccRisk)}
			</div>
		</section>

		<section class="{card} p-4">
			<h2 class="font-black uppercase">Legacy</h2>
			<div class="mt-3 space-y-2 text-sm">
				{@render legacyBar('Nation Health', run.legacy.nationHealth)}
				{@render legacyBar('Public Trust', run.legacy.publicTrust)}
				{@render legacyBar('Integrity', run.legacy.integrity)}
				{@render legacyBar('Standing', run.legacy.internationalStanding)}
			</div>
		</section>
	{/if}

	<section class="{card} p-4">
		<h2 class="font-black uppercase">Past results</h2>
		<div class="mt-3 space-y-2 text-sm font-medium">
			{#each pastRuns as past (past.id)}
				<p>{past.legacy.ending}: {past.legacy.score}</p>
			{:else}
				<p>No completed runs yet.</p>
			{/each}
		</div>
	</section>
</aside>

{#snippet meterRow(label, value)}
	<div class="flex justify-between gap-4">
		<span class="font-medium text-zinc-600">{label}</span>
		<strong>{value}</strong>
	</div>
{/snippet}

{#snippet legacyBar(label, value)}
	<div>
		<div class="flex justify-between gap-4">
			<span class="font-medium">{label}</span>
			<strong>{value}</strong>
		</div>
		<div class="mt-1 h-3 border-2 border-black bg-white">
			<div class="h-full bg-emerald-500" style={`width: ${value}%`}></div>
		</div>
	</div>
{/snippet}
