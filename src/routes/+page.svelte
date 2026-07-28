<script>
	// @ts-nocheck
	import nigeria from '@svg-maps/nigeria';
	import {
		applyCampaignAction,
		calculateVotes,
		campaignActions,
		careers,
		createRun,
		defaultRulebook,
		getPartyThreshold,
		godfatherOffer,
		loadHistory,
		loadRun,
		parties,
		religions,
		resolveElection,
		resolveTribunal,
		riggingActions,
		saveRun,
		scandals,
		seededState,
		setRulebookProvisions,
		simulatePolicy,
		spendLevels,
		startingProfile,
		wealths
	} from '$lib/game/engine.js';
	import { onMount } from 'svelte';
	import favicon from '$lib/assets/favicon.png';

	let { data } = $props();

	let playerName = $state('');
	let party = $state('LP');
	let foundingMembers = $state(0);
	let foundingSpread = $state(0);
	let career = $state('outsider');
	let wealth = $state('middle');
	let scandal = $state('clean');
	let religion = $state('None');
	let origin = $state('lagos');
	let registered = $state(false);
	let showRegister = $state(false);
	let registering = $state(false);
	let reg = $state({ name: '', email: '', country: 'Nigeria', consent: false });
	let regError = $state('');
	let selectedState = $state('lagos');
	let spendLevel = $state('medium');
	let selectedRigging = $state('none');
	let policy = $state({
		title: 'Community Security and Schools Compact',
		sector: 'security',
		scope: 'national',
		description:
			'Fund joint community safety patrols, school reopening grants, and transparent local delivery dashboards.'
	});
	let tribunalCounter = $state('legal_spend');
	let error = $state('');
	let run = $state(null);
	let pastRuns = $state([]);

	const threshold = $derived(getPartyThreshold());
	const actionEntries = $derived(Object.entries(campaignActions).filter(([id]) => id !== 'rest'));
	const electionPreview = $derived(run ? calculateVotes(run) : null);
	const canAct = $derived(run?.phase === 'campaign');
	const currentOffer = $derived(run && run.phase === 'campaign' ? godfatherOffer(run) : 0);
	const stateInfo = $derived(electionPreview?.states.find((s) => s.id === selectedState) ?? null);
	const multiplier = $derived(spendLevels[spendLevel].multiplier);
	const previewProfile = $derived(startingProfile({ career, wealth, scandal }));

	const steps = ['Campaign', 'Election', 'Govern', 'Tribunal', 'Legacy'];
	const stepIndex = $derived(
		{ campaign: 0, election: 1, policy: 2, tribunal: 3, complete: 4 }[run?.phase] ?? 0
	);

	onMount(() => {
		// Set the live rulebook client-side only — never mutate the shared module
		// singleton during SSR, where it would leak across requests.
		setRulebookProvisions(data.provisions);
		registered = localStorage.getItem('your-excellency-registered') === '1';
		const saved = loadRun();
		if (saved) run = saved;
		pastRuns = loadHistory();
	});

	function naira(value) {
		const abs = Math.abs(value);
		const text =
			abs >= 1_000_000_000
				? `₦${(abs / 1_000_000_000).toFixed(1)}bn`
				: `₦${Math.round(abs / 1_000_000)}m`;
		return value < 0 ? `+${text}` : text;
	}

	function votes(value) {
		return value >= 1_000_000
			? `${(value / 1_000_000).toFixed(1)}m`
			: `${Math.round(value / 1000)}k`;
	}

	function actionCost(id, action) {
		return id === 'godfather_deal' ? -currentOffer : Math.round(action.nairaCost * multiplier);
	}

	function startRun() {
		if (!registered) {
			regError = '';
			showRegister = true;
			return;
		}
		beginRun();
	}

	function beginRun() {
		const result = createRun({
			playerName,
			party,
			foundingMembers,
			foundingSpread,
			career,
			wealth,
			scandal,
			religion,
			origin
		});
		if (!result.ok) {
			error = `${result.error} (${result.provisionId})`;
			return;
		}
		error = '';
		run = result.run;
		persist();
	}

	async function submitRegister() {
		if (!reg.name.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(reg.email) || !reg.consent) {
			regError = 'Add your name, a valid email, and tick the consent box.';
			return;
		}
		registering = true;
		try {
			const res = await fetch('/api/register', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					name: reg.name,
					email: reg.email,
					country: reg.country,
					consent: reg.consent
				})
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				regError = data.error || 'Could not register — please try again.';
				return;
			}
			localStorage.setItem('your-excellency-registered', '1');
			registered = true;
			showRegister = false;
			regError = '';
			beginRun();
		} catch {
			regError = 'Network error — please try again.';
		} finally {
			registering = false;
		}
	}

	function act(actionId) {
		applyResult(applyCampaignAction(run, actionId, selectedState, spendLevel));
	}

	function endWeek() {
		applyResult(applyCampaignAction(run, 'rest', selectedState));
	}

	function election() {
		applyResult(resolveElection(run, selectedRigging, selectedState));
	}

	let policyLoading = $state(false);

	async function submitPolicy() {
		policyLoading = true;
		let aiResponse = null;
		try {
			// AI reaction (Milestone B): cached + validated server-side; any failure → deterministic fallback
			const insecurity = Math.round(
				run.state.states.reduce((sum, s) => sum + s.insecurityIndex, 0) / run.state.states.length
			);
			const res = await fetch('/api/policy', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					policy,
					ctx: { party: run.party, origin: run.origin, religion: run.religion, insecurity }
				})
			});
			if (res.ok) aiResponse = (await res.json()).response;
		} catch {
			// offline / provider down → fallback
		}
		policyLoading = false;
		applyResult(simulatePolicy(run, policy, aiResponse));
	}

	function tribunal() {
		applyResult(resolveTribunal(run, tribunalCounter));
	}

	function applyResult(result) {
		if (!result.ok) {
			error = result.error;
			return;
		}
		error = '';
		run = result.run;
		persist();
	}

	function resetRun() {
		localStorage.removeItem('your-excellency-current');
		run = null;
		error = '';
		pastRuns = loadHistory();
	}

	function persist() {
		if (run) saveRun(run);
		pastRuns = loadHistory();
	}

	function stateFill(id) {
		const s = electionPreview?.states.find((item) => item.id === id);
		if (!s) return '#e7e5e4';
		const margin = (s.playerVotes - s.opponentVotes) / Math.max(1, s.opponentVotes);
		if (margin >= 0.1) return '#a3e635';
		if (margin >= 0) return '#d9f99d';
		if (margin >= -0.1) return '#fda4af';
		return '#fb7185';
	}

	const card = 'border-4 border-black bg-white shadow-[6px_6px_0_0_#000]';
	const btn =
		'border-2 border-black font-black uppercase tracking-wide shadow-[4px_4px_0_0_#000] transition active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-40 disabled:shadow-none';
	const field = 'border-2 border-black bg-white px-3 py-2 font-medium focus:ring-0';
</script>

<svelte:head>
	<title>Your Excellency</title>
	<meta
		name="description"
		content="A Nigerian political simulator about reforming a system built to resist good leadership."
	/>
</svelte:head>

<main class="min-h-screen bg-amber-100 text-black">
	<section class="border-b-4 border-black bg-emerald-400">
		<div class="mx-auto grid max-w-7xl gap-6 px-4 py-8 md:grid-cols-[1.4fr_0.8fr] md:px-8">
			<div>
				<p
					class="inline-flex -rotate-1 items-center gap-2 border-2 border-black bg-yellow-300 px-2 py-1 text-sm font-black uppercase shadow-[3px_3px_0_0_#000]"
				>
					<img src={favicon} alt="" class="w-10" />
					Your Excellency
				</p>
				<h1 class="mt-4 max-w-3xl text-4xl font-black uppercase leading-tight md:text-6xl">
					Win Aso Rock without losing the country.
				</h1>
				<p class="mt-4 max-w-2xl border-l-4 border-black pl-3 text-lg font-medium">
					Run for President across all 36 states. Corruption pays quickly, reform pays slowly — and
					Legacy is the only real score.
				</p>
			</div>

			<div class="grid content-end gap-3 text-sm">
				<aside
					class="{card} rulebook-notice bg-amber-50 p-4"
					role="note"
					aria-labelledby="rulebook-disclaimer-title"
				>
					<div class="flex items-start gap-3">
						<span
							class="grid size-7 shrink-0 place-items-center border-2 border-black bg-black font-black text-yellow-300"
							aria-hidden="true">!</span
						>
						<div>
							<p id="rulebook-disclaimer-title" class="font-black uppercase">Rulebook disclaimer</p>
							<p class="mt-1 font-medium">
								This is a game abstraction of Nigerian law and politics. It is not legal advice.
							</p>
						</div>
					</div>
				</aside>
				<button class="{btn} bg-black px-4 py-3 text-white" onclick={resetRun}>New run</button>
			</div>
		</div>
	</section>

	{#if run}
		<div class="border-b-4 border-black bg-white">
			<div class="mx-auto flex max-w-7xl flex-wrap gap-2 px-4 py-3 md:px-8">
				{#each steps as step, i (step)}
					<span
						class={[
							'border-2 border-black px-3 py-1 text-xs font-black uppercase',
							i === stepIndex &&
								run.phase !== 'complete' &&
								'bg-yellow-300 shadow-[3px_3px_0_0_#000]',
							(i < stepIndex || run.phase === 'complete') && 'bg-emerald-400',
							i > stepIndex && 'bg-white opacity-50'
						]}
					>
						{i + 1}. {step}
					</span>
				{/each}
			</div>
		</div>
	{/if}

	<div class="mx-auto grid max-w-7xl gap-6 px-4 py-6 pb-24 md:grid-cols-[280px_1fr] md:px-8">
		<aside class="space-y-5">
			<details class="{card} p-4" open={!run}>
				<summary class="cursor-pointer font-black uppercase">How to play</summary>
				<ol class="mt-3 list-decimal space-y-2 pl-5 text-sm font-medium">
					<li><strong>Create your candidate</strong> — join a party or found your own.</li>
					<li>
						<strong>Campaign for 6 weeks.</strong> Each week you get 5 action points. Tap a state on the
						map, pick an action, and choose how much to spend — small, medium or large. Green actions
						build real support. The red one pays fast, but EFCC go dey watch you.
					</li>
					<li>
						<strong>Election day:</strong> run clean, push turnout, or rig — rigging fit land you for
						tribunal.
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
					<p class="text-xs font-medium">
						Supporters donate every week — more popularity, more money.
					</p>
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

		<div class="space-y-6">
			{#if error}
				<div class="border-4 border-black bg-rose-400 p-4 font-black shadow-[6px_6px_0_0_#000]">
					{error}
				</div>
			{/if}

			{#if !run}
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
							<span class="text-xs font-medium text-zinc-600"
								>Leans support toward aligned regions.</span
							>
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
							<span
								>War chest: <span class="text-green-600">{naira(previewProfile.naira)}</span></span
							>
							<span
								>Popularity: <span class="text-green-600">{previewProfile.popularity}</span></span
							>
							<span
								>Connections: <span class="text-green-600">{previewProfile.connections}</span></span
							>
							<span>Integrity: <span class="text-green-600">{previewProfile.integrity}</span></span>
							<span>Trust: <span class="text-green-600">{previewProfile.publicTrust}</span></span>
							<span>EFCC risk: <span class="text-red-600">{previewProfile.efccRisk}</span></span>
						</div>
					</div>

					<button class="{btn} mt-5 bg-emerald-400 px-4 py-3" onclick={startRun}
						>Begin your presidency →</button
					>
				</section>
			{:else if run.phase === 'campaign'}
				{@render nigeriaMap('Nigeria — tap a state to campaign there')}

				<section class="{card} p-5">
					<div class="flex flex-wrap items-center justify-between gap-3">
						<h2 class="text-2xl font-black uppercase">This week's moves</h2>
						<div class="flex border-2 border-black">
							{#each Object.entries(spendLevels) as [id, level] (id)}
								<button
									class={[
										'px-3 py-1.5 text-xs font-black uppercase',
										spendLevel === id ? 'bg-black text-white' : 'bg-white'
									]}
									onclick={() => (spendLevel = id)}
								>
									{level.label}
								</button>
							{/each}
						</div>
					</div>
					<p class="mt-1 text-sm font-medium">
						Spend size scales both the cost and the effect. Money moves: donations come in weekly,
						and the godfather's offer changes every week.
					</p>

					<div class="mt-5 grid gap-4 lg:grid-cols-2">
						{#each actionEntries as [id, action] (id)}
							{@const cost = actionCost(id, action)}
							{@const blocked = !canAct || run.ap < action.apCost || (cost > 0 && run.naira < cost)}
							<button
								class={[
									'border-4 border-black p-4 text-left shadow-[5px_5px_0_0_#000] transition active:translate-x-1 active:translate-y-1 active:shadow-none',
									action.tone === 'dirty' ? 'bg-rose-300' : 'bg-lime-300',
									blocked && 'opacity-40 shadow-none'
								]}
								disabled={blocked}
								onclick={() => act(id)}
							>
								<span class="font-black uppercase">{action.label}</span>
								<span class="mt-1 block text-sm font-medium">{action.blurb}</span>
								<span class="mt-2 block text-sm font-black">
									{action.apCost} AP · {naira(cost)}{id === 'godfather_deal' ? ' this week' : ''}
								</span>
							</button>
						{/each}
					</div>

					<button class="{btn} mt-5 bg-white px-4 py-2" onclick={endWeek}>Rest / end week</button>
				</section>
			{:else if run.phase === 'election'}
				<section class="{card} p-5">
					<h2 class="text-2xl font-black uppercase">Election day</h2>
					<p class="mt-2 font-medium">
						Projection: you {votes(electionPreview.playerLegitimate)} vs opponent {votes(
							electionPreview.opponentOfficial
						)}
						— you dey lead for {electionPreview.statesCarried} of 37 states.
					</p>
					<div class="mt-5 grid gap-4 md:grid-cols-2">
						<label class="grid gap-2">
							<span class="text-sm font-black uppercase">Your final move</span>
							<select class={field} bind:value={selectedRigging}>
								{#each Object.entries(riggingActions) as [id, action] (id)}
									<option value={id}
										>{action.label}{action.nairaCost ? ` — ${naira(action.nairaCost)}` : ''}</option
									>
								{/each}
							</select>
						</label>
						<div class="text-sm font-medium">
							<p>Target state: <strong>{stateInfo?.name}</strong> (tap the map to change).</p>
							<p class="mt-1">
								Rigging is harder to detect where insecurity is high — that is the rot the game is
								pointing at, not a bonus.
							</p>
						</div>
					</div>
					<button class="{btn} mt-5 bg-black px-4 py-3 text-white" onclick={election}
						>Declare result</button
					>
				</section>

				{@render nigeriaMap('Where do you make your final move?')}
			{:else if run.phase === 'policy'}
				<section class="{card} p-5">
					<h2 class="text-2xl font-black uppercase">Your first policy as President</h2>
					<p class="mt-1 text-sm font-medium">
						One policy. Nigerians will judge the delivery, not the speech.
					</p>
					<div class="mt-5 grid gap-4">
						<input class={field} bind:value={policy.title} />
						<select class={field} bind:value={policy.sector}>
							<option value="security">Security</option>
							<option value="jobs">Jobs</option>
							<option value="education">Education</option>
						</select>
						<textarea class="{field} min-h-32" bind:value={policy.description}></textarea>
					</div>
					<button
						class="{btn} mt-5 bg-emerald-400 px-4 py-3"
						onclick={submitPolicy}
						disabled={policyLoading}
					>
						{policyLoading ? 'Nigerians are reacting…' : 'Announce policy'}
					</button>
				</section>
			{:else if run.phase === 'tribunal'}
				<section class="{card} p-5">
					<h2 class="text-2xl font-black uppercase">{run.policy.response.headline}</h2>
					<p class="mt-2 font-medium">
						Net approval {run.policy.response.netApproval}; trending {run.policy.response
							.trendingHashtag}.
						{run.policy.response.unintendedConsequence}
					</p>
					<div class="mt-4 grid gap-4 md:grid-cols-3">
						{#each run.policy.response.segments as segment (segment.name)}
							<div class="border-2 border-black bg-amber-50 p-3 shadow-[3px_3px_0_0_#000]">
								<p class="font-black uppercase">{segment.name}</p>
								<p class="text-sm font-medium">{segment.concern}</p>
								<p class="mt-2 text-sm font-bold">Approval {segment.approvalDelta}</p>
							</div>
						{/each}
					</div>

					<div class="mt-6 border-t-4 border-black pt-5">
						<h3 class="text-xl font-black uppercase">Tribunal challenge</h3>
						<p class="mt-1 text-sm font-medium">
							The loser has gone to court. Choose your defence.
						</p>
						<label class="mt-3 grid gap-2 md:max-w-sm">
							<span class="text-sm font-black uppercase">Counter</span>
							<select class={field} bind:value={tribunalCounter}>
								<option value="self_defence">Defend yourself in court (free)</option>
								<option value="legal_spend">Transparent legal defence — ₦180m</option>
								<option value="technicality">Technicality motion — ₦90m</option>
								<option value="delay_motion">Delay motion — ₦60m</option>
								<option value="judge_bribe">Judge bribe — ₦400m</option>
							</select>
						</label>
						<button class="{btn} mt-5 bg-black px-4 py-3 text-white" onclick={tribunal}
							>Resolve tribunal</button
						>
					</div>
				</section>
			{:else}
				<section class="{card} p-5">
					<p
						class="inline-block border-2 border-black bg-yellow-300 px-2 py-0.5 text-sm font-black uppercase"
					>
						Final legacy
					</p>
					<h2 class="mt-2 text-4xl font-black uppercase">{run.legacy.ending}</h2>
					<p class="mt-2 text-xl font-bold">Score: {run.legacy.score}</p>
					{#if run.election}
						<p class="mt-4 font-medium">
							Official result: {votes(run.election.playerOfficial)} to {votes(
								run.election.opponentOfficial
							)}, carrying {run.election.statesCarried} of 37 states on legitimate votes.
							{run.election.detected
								? 'Evidence of manipulation followed you into court.'
								: 'No election-day detection was recorded.'}
						</p>
					{/if}
					{#if run.tribunal}
						<p class="mt-2 font-medium">Tribunal: {run.tribunal.outcome.replace('_', ' ')}.</p>
					{/if}
					<button class="{btn} mt-5 bg-emerald-400 px-4 py-3" onclick={resetRun}
						>Start another run</button
					>
				</section>

				{@render nigeriaMap('How Nigeria voted (legitimate votes)')}
			{/if}

			{#if run}
				<section class="{card} p-5">
					<h2 class="text-xl font-black uppercase">Run log</h2>
					<ol class="mt-3 list-decimal space-y-1 pl-5 text-sm font-medium">
						{#each run.history as item, index (index)}
							<li>{item}</li>
						{/each}
					</ol>
				</section>
			{/if}
		</div>
	</div>

	{#if showRegister}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
			<div class="{card} w-full max-w-md p-6">
				<h2 class="text-2xl font-black uppercase">One quick step</h2>
				<p class="mt-1 text-sm font-medium">
					Sign up to play — it saves your Legacy and lets us tell you when new seasons drop. Free,
					no spam.
				</p>
				<div class="mt-4 grid gap-3">
					<label class="grid gap-1">
						<span class="text-xs font-black uppercase">Name</span>
						<input class={field} bind:value={reg.name} placeholder="Your name" />
					</label>
					<label class="grid gap-1">
						<span class="text-xs font-black uppercase">Email</span>
						<input
							class={field}
							type="email"
							bind:value={reg.email}
							placeholder="you@example.com"
						/>
					</label>
					<label class="grid gap-1">
						<span class="text-xs font-black uppercase">Country</span>
						<select class={field} bind:value={reg.country}>
							{#each ['Nigeria', 'United States', 'United Kingdom', 'Canada', 'Ghana', 'South Africa', 'Germany', 'United Arab Emirates', 'Other'] as c (c)}
								<option value={c}>{c}</option>
							{/each}
						</select>
					</label>
					<label class="flex items-start gap-2 text-sm font-medium">
						<input
							type="checkbox"
							class="mt-1 h-4 w-4 border-2 border-black"
							bind:checked={reg.consent}
						/>
						<span>I agree to receive occasional emails about Your Excellency.</span>
					</label>
				</div>
				{#if regError}
					<p class="mt-3 border-2 border-black bg-rose-300 p-2 text-sm font-bold">{regError}</p>
				{/if}
				<div class="mt-5 flex gap-3">
					<button
						class="{btn} bg-emerald-400 px-4 py-2 disabled:opacity-50"
						disabled={registering}
						onclick={submitRegister}
					>
						{registering ? 'Saving…' : 'Play now'}
					</button>
					<button class="{btn} bg-white px-4 py-2" onclick={() => (showRegister = false)}
						>Cancel</button
					>
				</div>
			</div>
		</div>
	{/if}

	<footer class="border-t-4 border-black bg-white">
		<div
			class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 text-sm font-bold md:px-8"
		>
			<p class="font-medium">
				Also from us: <a
					class="underline decoration-2 underline-offset-2 hover:bg-yellow-300"
					href="https://otr.techgfxlimited.com/">On The Record</a
				> — chat with AI avatars of Nigerian leaders, grounded in their real public record.
			</p>
			<div class="flex items-center gap-2">
				<a
					class="{btn} bg-yellow-300 px-3 py-1.5 text-sm"
					href="https://ko-fi.com/theaveragetechdad"
					rel="noopener">Buy me kunu</a
				>
				<a
					class="{btn} grid size-9 place-items-center bg-white"
					href="https://www.youtube.com/@TheAverageTechDad"
					rel="noopener"
					aria-label="YouTube — The Average Tech Dad"
				>
					<svg viewBox="0 0 24 24" class="size-5" fill="currentColor" aria-hidden="true">
						<path
							d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8ZM9.5 15.6V8.4l6.3 3.6-6.3 3.6Z"
						/>
					</svg>
				</a>
			</div>
		</div>
	</footer>
</main>

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

{#snippet nigeriaMap(title)}
	<section class="{card} p-5">
		<h2 class="text-xl font-black uppercase">{title}</h2>
		<div class="mt-4 grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
			<svg
				viewBox={nigeria.viewBox}
				class="w-full border-2 border-black bg-sky-100"
				role="group"
				aria-label="Map of Nigeria by state"
			>
				{#each nigeria.locations as loc (loc.id)}
					<path
						d={loc.path}
						fill={stateFill(loc.id)}
						stroke="#000"
						stroke-width={selectedState === loc.id ? 3 : 1}
						class="cursor-pointer hover:opacity-80"
						role="button"
						aria-label={loc.name}
						tabindex="0"
						onclick={() => (selectedState = loc.id)}
						onkeydown={(e) => e.key === 'Enter' && (selectedState = loc.id)}
					/>
				{/each}
			</svg>

			<div>
				{#if stateInfo}
					<div class="border-4 border-black bg-amber-50 p-4 shadow-[5px_5px_0_0_#000]">
						<div class="flex items-start justify-between gap-2">
							<h3 class="text-lg font-black uppercase">{stateInfo.name}</h3>
							<span
								class="border-2 border-black bg-white px-1.5 py-0.5 text-xs font-black uppercase"
							>
								{stateInfo.playerVotes > stateInfo.opponentVotes ? 'Leading' : 'Trailing'}
							</span>
						</div>
						<p class="mt-2 text-xs font-bold uppercase">
							⚠ {stateInfo.threatType.replace('_', '/')} · insecurity {stateInfo.insecurityIndex}/100
						</p>
						<div class="mt-1 h-2 border-2 border-black bg-white">
							<div class="h-full bg-black" style={`width: ${stateInfo.insecurityIndex}%`}></div>
						</div>
						<p class="mt-3 text-sm font-medium">
							Turnout {Math.round(stateInfo.effectiveTurnout * 100)}% of {votes(
								stateInfo.registeredVoters
							)} voters
						</p>
						<p class="text-sm font-black">
							You {votes(stateInfo.playerVotes)} · Opp {votes(stateInfo.opponentVotes)}
						</p>
						<p class="mt-1 text-xs font-medium">
							Insecurity suppresses turnout — one reason the numbers stay low.
						</p>
					</div>
				{/if}

				<div class="mt-4 border-2 border-black bg-white p-3">
					<p class="text-xs font-black uppercase">National projection</p>
					<p class="text-sm font-bold">
						You {votes(electionPreview.playerLegitimate)} · Opp {votes(
							electionPreview.opponentOfficial
						)}
					</p>
					<p class="text-sm font-medium">Leading in {electionPreview.statesCarried} of 37 states</p>
				</div>

				<div class="mt-4 flex flex-wrap gap-2 text-xs font-black uppercase">
					<span class="border-2 border-black bg-lime-400 px-2 py-0.5">Clear lead</span>
					<span class="border-2 border-black bg-lime-200 px-2 py-0.5">Narrow lead</span>
					<span class="border-2 border-black bg-rose-300 px-2 py-0.5">Narrow trail</span>
					<span class="border-2 border-black bg-rose-400 px-2 py-0.5">Losing badly</span>
				</div>
			</div>
		</div>
	</section>
{/snippet}

<style>
	.rulebook-notice {
		animation: rulebook-arrival 600ms cubic-bezier(0.16, 1, 0.3, 1) 120ms both;
	}

	@keyframes rulebook-arrival {
		from {
			transform: translate3d(0, -12px, 0) rotate(-1.5deg) scale(0.98);
			box-shadow: 10px 10px 0 0 #000;
		}

		to {
			transform: translate3d(0, 0, 0) rotate(0) scale(1);
			box-shadow: 6px 6px 0 0 #000;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.rulebook-notice {
			animation: none;
		}
	}
</style>
