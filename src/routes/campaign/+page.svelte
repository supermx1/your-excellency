<script>
	// @ts-nocheck
	import {
		applyCampaignAction,
		calculateVotes,
		createRun,
		loadHistory,
		loadRun,
		resolveElection,
		resolveTribunal,
		saveRun,
		setRulebookProvisions,
		simulatePolicy
	} from '$lib/game/engine.js';
	import CampaignPhase from '$lib/components/campaign/CampaignPhase.svelte';
	import CandidateSetup from '$lib/components/campaign/CandidateSetup.svelte';
	import ElectionPhase from '$lib/components/campaign/ElectionPhase.svelte';
	import LegacyPhase from '$lib/components/campaign/LegacyPhase.svelte';
	import PolicyPhase from '$lib/components/campaign/PolicyPhase.svelte';
	import RegisterGate from '$lib/components/RegisterGate.svelte';
	import Sidebar from '$lib/components/campaign/Sidebar.svelte';
	import TribunalPhase from '$lib/components/campaign/TribunalPhase.svelte';
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
	let policyLoading = $state(false);
	let error = $state('');
	let run = $state(null);
	let pastRuns = $state([]);

	const electionPreview = $derived(run ? calculateVotes(run) : null);

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

	function startRun() {
		if (!registered) {
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

	function onRegistered() {
		registered = true;
		beginRun();
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

	const card = 'border-4 border-black bg-white shadow-[6px_6px_0_0_#000]';
	const btn =
		'border-2 border-black font-black uppercase tracking-wide shadow-[4px_4px_0_0_#000] transition active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-40 disabled:shadow-none';
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
		<Sidebar {run} {pastRuns} />

		<div class="space-y-6">
			{#if error}
				<div class="border-4 border-black bg-rose-400 p-4 font-black shadow-[6px_6px_0_0_#000]">
					{error}
				</div>
			{/if}

			{#if !run}
				<CandidateSetup
					bind:playerName
					bind:party
					bind:foundingMembers
					bind:foundingSpread
					bind:career
					bind:wealth
					bind:scandal
					bind:religion
					bind:origin
					onStart={startRun}
				/>
			{:else if run.phase === 'campaign'}
				<CampaignPhase
					{run}
					{electionPreview}
					bind:selectedState
					bind:spendLevel
					onAct={act}
					onEndWeek={endWeek}
				/>
			{:else if run.phase === 'election'}
				<ElectionPhase
					{electionPreview}
					bind:selectedState
					bind:selectedRigging
					onElection={election}
				/>
			{:else if run.phase === 'policy'}
				<PolicyPhase bind:policy {policyLoading} onSubmit={submitPolicy} />
			{:else if run.phase === 'tribunal'}
				<TribunalPhase {run} bind:tribunalCounter onResolve={tribunal} />
			{:else}
				<LegacyPhase {run} {electionPreview} bind:selectedState onReset={resetRun} />
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

	<RegisterGate bind:open={showRegister} {onRegistered} />
</main>

<style>
	:global(.rulebook-notice) {
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
		:global(.rulebook-notice) {
			animation: none;
		}
	}
</style>
