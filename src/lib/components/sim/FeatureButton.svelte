<script>
	// @ts-nocheck
	// Owner-only: saves the run (if needed), then features it with its full recording.
	// Shown only on devices where the owner turned on owner tools at /admin/sim.
	import { packOutput } from '$lib/game/sim/recording.js';

	let { run, inputs, summary = null, runId = null, class: className = '' } = $props();

	let owner = $state(false);
	let status = $state('');
	$effect(() => {
		try {
			owner = localStorage.getItem('timeline-owner') === '1';
		} catch {
			owner = false;
		}
	});

	async function feature() {
		const password = prompt('Admin password');
		if (!password) return;
		const title = prompt('Title for this featured run', '') ?? '';
		status = 'Saving…';
		try {
			let id = runId;
			if (!id) {
				const res = await fetch('/api/sim/runs', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ inputs, summary })
				});
				const body = await res.json();
				if (!res.ok) throw new Error(body.error);
				id = body.id;
			}
			const res = await fetch(`/api/sim/runs/${id}/feature`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ password, title, output: await packOutput(run) })
			});
			const body = await res.json();
			if (!res.ok) throw new Error(body.error);
			status = `Featured: /sim/run/${id}`;
		} catch (e) {
			status = e.message || 'Could not feature this run.';
		}
	}
</script>

{#if owner}
	<span class="inline-flex items-center gap-2">
		<button type="button" class={className} onclick={feature}>Feature this run</button>
		{#if status}<span class="text-sm font-bold" role="status">{status}</span>{/if}
	</span>
{/if}
