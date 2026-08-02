<script>
	// @ts-nocheck
	let { policy = $bindable(), policyLoading = false, onSubmit } = $props();

	const card = 'border-4 border-black bg-white shadow-[6px_6px_0_0_#000]';
	const btn =
		'border-2 border-black font-black uppercase tracking-wide shadow-[4px_4px_0_0_#000] transition active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-40 disabled:shadow-none';
	const field = 'border-2 border-black bg-white px-3 py-2 font-medium focus:ring-0';
</script>

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
	<button class="{btn} mt-5 bg-emerald-400 px-4 py-3" onclick={onSubmit} disabled={policyLoading}>
		{policyLoading ? 'Nigerians are reacting…' : 'Announce policy'}
	</button>
</section>
