<script>
	// @ts-nocheck
	let { run, tribunalCounter = $bindable('legal_spend'), onResolve } = $props();

	const card = 'border-4 border-black bg-white shadow-[6px_6px_0_0_#000]';
	const btn =
		'border-2 border-black font-black uppercase tracking-wide shadow-[4px_4px_0_0_#000] transition active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-40 disabled:shadow-none';
	const field = 'border-2 border-black bg-white px-3 py-2 font-medium focus:ring-0';
</script>

<section class="{card} p-5">
	<h2 class="text-2xl font-black uppercase">{run.policy.response.headline}</h2>
	<p class="mt-2 font-medium">
		Net approval {run.policy.response.netApproval}; trending {run.policy.response.trendingHashtag}.
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
		<p class="mt-1 text-sm font-medium">The loser has gone to court. Choose your defence.</p>
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
		<button class="{btn} mt-5 bg-black px-4 py-3 text-white" onclick={onResolve}
			>Resolve tribunal</button
		>
	</div>
</section>
