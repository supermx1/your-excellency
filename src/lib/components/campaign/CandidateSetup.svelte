<script>
	// @ts-nocheck
	import {
		careers,
		getPartyThreshold,
		parties,
		religions,
		scandals,
		seededState,
		startingProfile,
		wealths
	} from '$lib/game/engine.js';

	let {
		playerName = $bindable(''),
		party = $bindable('LP'),
		foundingMembers = $bindable(0),
		foundingSpread = $bindable(0),
		career = $bindable('outsider'),
		wealth = $bindable('middle'),
		scandal = $bindable('clean'),
		religion = $bindable('None'),
		origin = $bindable('lagos'),
		onStart
	} = $props();

	const threshold = $derived(getPartyThreshold());
	const previewProfile = $derived(startingProfile({ career, wealth, scandal }));

	function naira(value) {
		const abs = Math.abs(value);
		const text =
			abs >= 1_000_000_000
				? `₦${(abs / 1_000_000_000).toFixed(1)}bn`
				: `₦${Math.round(abs / 1_000_000)}m`;
		return value < 0 ? `+${text}` : text;
	}

	const card = 'border-4 border-black bg-white shadow-[6px_6px_0_0_#000]';
	const btn =
		'border-2 border-black font-black uppercase tracking-wide shadow-[4px_4px_0_0_#000] transition active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-40 disabled:shadow-none';
	const field = 'border-2 border-black bg-white px-3 py-2 font-medium focus:ring-0';
</script>

<section class="{card} p-5">
	<h2 class="text-2xl font-black uppercase">Create identity</h2>
	<div class="mt-5 grid gap-4 md:grid-cols-2">
		<label class="grid gap-2">
			<span class="text-sm font-black uppercase">Candidate name</span>
			<input class={field} bind:value={playerName} placeholder="The Reformer" />
		</label>

		<label class="grid gap-2">
			<span class="text-sm font-black uppercase">Party</span>
			<select class={field} bind:value={party}>
				{#each parties as option (option)}
					<option value={option}>{option}</option>
				{/each}
				<option value="FOUND">Found YEP</option>
			</select>
		</label>

		<label class="grid gap-2">
			<span class="text-sm font-black uppercase">Background / career</span>
			<select class={field} bind:value={career}>
				{#each Object.entries(careers) as [id, c] (id)}
					<option value={id}>{c.label}</option>
				{/each}
			</select>
			<span class="text-xs font-medium text-zinc-600">{careers[career].blurb}</span>
		</label>

		<label class="grid gap-2">
			<span class="text-sm font-black uppercase">Wealth</span>
			<select class={field} bind:value={wealth}>
				{#each Object.entries(wealths) as [id, w] (id)}
					<option value={id}>{w.label}</option>
				{/each}
			</select>
			<span class="text-xs font-medium text-zinc-600">{wealths[wealth].blurb}</span>
		</label>

		<label class="grid gap-2">
			<span class="text-sm font-black uppercase">Scandal history</span>
			<select class={field} bind:value={scandal}>
				{#each Object.entries(scandals) as [id, s] (id)}
					<option value={id}>{s.label}</option>
				{/each}
			</select>
			<span class="text-xs font-medium text-zinc-600">{scandals[scandal].blurb}</span>
		</label>

		<label class="grid gap-2">
			<span class="text-sm font-black uppercase">Religion</span>
			<select class={field} bind:value={religion}>
				{#each religions as r (r)}
					<option value={r}>{r}</option>
				{/each}
			</select>
			<span class="text-xs font-medium text-zinc-600">Leans support toward aligned regions.</span>
		</label>

		<label class="grid gap-2 md:col-span-2">
			<span class="text-sm font-black uppercase">State of origin</span>
			<select class={field} bind:value={origin}>
				{#each seededState.states as s (s.id)}
					<option value={s.id}>{s.name}</option>
				{/each}
			</select>
			<span class="text-xs font-medium text-zinc-600"
				>Your home state gives you a turnout edge there.</span
			>
		</label>

		{#if party === 'FOUND'}
			<label class="grid gap-2">
				<span class="text-sm font-black uppercase">Members pledged</span>
				<input class={field} type="number" bind:value={foundingMembers} />
			</label>
			<label class="grid gap-2">
				<span class="text-sm font-black uppercase">LGA spread</span>
				<input class={field} type="number" bind:value={foundingSpread} />
			</label>
			<p class="text-sm font-medium md:col-span-2">
				Threshold: {threshold.memberThreshold.toLocaleString()} members across {threshold.spreadLgas}
				LGAs, from provision {threshold.provisionId}.
			</p>
		{/if}
	</div>

	<div class="mt-5 border-4 border-black bg-amber-50 p-4 shadow-[5px_5px_0_0_#000]">
		<p class="text-xs font-black uppercase">You'll start with</p>
		<div class="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm font-bold sm:grid-cols-3">
			<span>War chest: <span class="text-green-600">{naira(previewProfile.naira)}</span></span>
			<span>Popularity: <span class="text-green-600">{previewProfile.popularity}</span></span>
			<span>Connections: <span class="text-green-600">{previewProfile.connections}</span></span>
			<span>Integrity: <span class="text-green-600">{previewProfile.integrity}</span></span>
			<span>Trust: <span class="text-green-600">{previewProfile.publicTrust}</span></span>
			<span>EFCC risk: <span class="text-red-600">{previewProfile.efccRisk}</span></span>
		</div>
	</div>

	<button class="{btn} mt-5 bg-emerald-400 px-4 py-3" onclick={onStart}
		>Begin your presidency →</button
	>
</section>
