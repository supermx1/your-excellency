<script>
	// @ts-nocheck
	import { defaultRulebook } from '$lib/game/city/engine.js';

	let { run, onEndTurn, onEmbezzle, onHandout, onElectionInsurance } = $props();

	const params = defaultRulebook.params;

	let embezzleAmount = $state(1_000_000);

	function naira(value) {
		const abs = Math.abs(value);
		const text =
			abs >= 1_000_000_000
				? `₦${(abs / 1_000_000_000).toFixed(1)}bn`
				: abs >= 1_000_000
					? `₦${(abs / 1_000_000).toFixed(1)}m`
					: `₦${Math.round(abs / 1000)}k`;
		return value < 0 ? `-${text}` : text;
	}

	const scrutinyLabels = {
		none: 'Clean',
		whispers: 'Whispers',
		press: 'Press Investigation',
		probe: 'EFCC Probe',
		conviction: 'Conviction'
	};

	const scrutinyBadgeClass = {
		none: 'bg-zinc-200 text-black',
		whispers: 'bg-yellow-300 text-black',
		press: 'bg-orange-400 text-black',
		probe: 'bg-red-500 text-white',
		conviction: 'bg-black text-red-500'
	};

	const scrutinyBarClass = {
		none: 'bg-zinc-400',
		whispers: 'bg-yellow-400',
		press: 'bg-orange-500',
		probe: 'bg-red-500',
		conviction: 'bg-red-700'
	};

	const frozen = $derived(run.scrutinyStage === 'probe');

	function embezzle() {
		onEmbezzle(embezzleAmount);
	}

	const card = 'border-4 border-black bg-white shadow-[6px_6px_0_0_#000]';
	const btn =
		'border-2 border-black font-black uppercase tracking-wide shadow-[4px_4px_0_0_#000] transition active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-40 disabled:shadow-none';
	const field = 'border-2 border-black bg-white px-3 py-2 font-medium focus:ring-0';
</script>

<section class="{card} p-4">
	<div class="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
		<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
			<div>
				<p class="text-xs font-black uppercase text-zinc-500">Turn</p>
				<p class="text-xl font-black">{run.turn}/{params.turns}</p>
			</div>
			<div>
				<p class="text-xs font-black uppercase text-zinc-500">Budget</p>
				<p class="text-xl font-black">{naira(run.budget)}</p>
				<p
					class="text-xs font-bold {run.lastTurnRevenue < 0 ? 'text-rose-600' : 'text-emerald-600'}"
				>
					{run.lastTurnRevenue >= 0 ? '+' : ''}{naira(run.lastTurnRevenue)} last turn
				</p>
				<p class="text-[11px] font-medium leading-tight text-zinc-500">
					{naira(run.lastAllocation ?? 0)} allocation{run.lastIgr
						? ` · ${naira(run.lastIgr)} IGR`
						: ''} · −{naira(run.lastMaintenance ?? 0)} upkeep
				</p>
			</div>
			<div>
				<p class="text-xs font-black uppercase text-zinc-500">Population</p>
				<p class="text-xl font-black">{run.population.toLocaleString()}</p>
				<p class="text-[11px] font-medium leading-tight text-zinc-500">
					Grows with housing and jobs
				</p>
			</div>
			<div>
				<p class="text-xs font-black uppercase text-zinc-500">Satisfaction</p>
				<p class="text-xl font-black">
					{run.satisfaction}
					{#if run.handoutBoost > 0}
						<span class="text-xs font-black text-red-600">(+{run.handoutBoost} bought)</span>
					{/if}
				</p>
				<div class="mt-1 h-2 w-full border border-black bg-white">
					<div
						class="h-full {run.satisfaction < 30
							? 'bg-red-500'
							: run.satisfaction < 60
								? 'bg-yellow-400'
								: 'bg-emerald-500'}"
						style="width: {run.satisfaction}%"
					></div>
				</div>
			</div>
			<div>
				<p class="text-xs font-black uppercase text-zinc-500">Scrutiny</p>
				<p class="text-xl font-black">{run.scrutiny}/100</p>
				<div class="mt-1 h-2 w-full border border-black bg-white">
					<div
						class="h-full {scrutinyBarClass[run.scrutinyStage]}"
						style="width: {run.scrutiny}%"
					></div>
				</div>
				<span
					class="mt-1 inline-block border-2 border-black px-1.5 py-0.5 text-[11px] font-black uppercase {scrutinyBadgeClass[
						run.scrutinyStage
					]} {run.scrutinyStage === 'conviction' ? 'animate-pulse' : ''}"
				>
					{scrutinyLabels[run.scrutinyStage]}
				</span>
				{#if frozen}
					<p class="mt-1 text-[11px] font-bold leading-tight text-red-600">
						Accounts frozen — no building or diverting.
					</p>
				{/if}
			</div>
		</div>

		<button class="{btn} bg-emerald-400 px-5 py-3" onclick={onEndTurn}>End turn →</button>
	</div>

	<div class="mt-4 border-2 border-dashed border-black bg-stone-800 p-3 text-white">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<div>
				<p class="text-xs font-black uppercase text-red-400">Under the table</p>
				<p class="text-xs font-medium text-stone-300">
					Divert public funds into your own pocket. Raises scrutiny — press, probe and conviction
					follow if you push it.
				</p>
			</div>
			<div class="flex items-center gap-2">
				<input
					class="{field} w-32 bg-white text-black"
					type="number"
					min="1"
					step="100000"
					bind:value={embezzleAmount}
					disabled={frozen}
				/>
				<button
					class="{btn} bg-red-500 px-3 py-2 text-white disabled:bg-stone-500"
					disabled={frozen || !(embezzleAmount > 0) || embezzleAmount > run.budget}
					onclick={embezzle}
				>
					Divert funds
				</button>
			</div>
		</div>
		<div class="mt-3 flex flex-wrap items-center gap-2 border-t border-stone-600 pt-3">
			<p class="mr-auto text-xs font-bold text-stone-300">
				In your pocket: <span class="text-base font-black text-white"
					>{naira(run.personalFunds ?? 0)}</span
				>
				<span class="text-stone-400">· {naira(run.embezzledTotal)} diverted in total</span>
			</p>
			<button
				class="{btn} bg-amber-400 px-3 py-2 text-black disabled:bg-stone-500"
				disabled={run.phase !== 'playing' || (run.personalFunds ?? 0) < params.handoutCost}
				onclick={onHandout}
				title="Rice, transport money and party shirts. Real goodwill that fades fast and fixes nothing."
			>
				Handouts · {naira(params.handoutCost)}
			</button>
			<button
				class="{btn} bg-purple-500 px-3 py-2 text-white disabled:bg-stone-500"
				disabled={run.phase !== 'playing' ||
					run.electionInsurance ||
					(run.personalFunds ?? 0) < params.electionInsuranceCost}
				onclick={onElectionInsurance}
				title="Agents, thugs and a friendly returning officer. Survive a verdict the ward would have lost."
			>
				{run.electionInsurance
					? 'Election secured'
					: `Rig election · ${naira(params.electionInsuranceCost)}`}
			</button>
		</div>
		<p class="mt-2 text-xs font-medium text-stone-400">
			Handouts buy {params.handoutBoost} satisfaction that decays every turn. Rigging buys the seat, not
			the ward — both raise scrutiny.
		</p>
	</div>
</section>
