<script>
	// @ts-nocheck
	let { inputs, summary = null, runId = null, class: className = '' } = $props();

	let status = $state('');
	let busy = $state(false);

	async function share() {
		busy = true;
		status = '';
		try {
			let id = runId;
			if (!id) {
				const res = await fetch('/api/sim/runs', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ inputs, summary })
				});
				const body = await res.json();
				if (!res.ok) throw new Error(body.error ?? 'Could not save this run.');
				id = body.id;
			}
			const url = `${location.origin}/sim/run/${id}`;
			await navigator.clipboard.writeText(url);
			status = 'Link copied';
		} catch (e) {
			status = e.message || 'Could not copy the link.';
		} finally {
			busy = false;
		}
	}
</script>

<span class="inline-flex items-center gap-2">
	<button type="button" class={className} disabled={busy} onclick={share}>{busy ? 'Saving…' : 'Share'}</button>
	{#if status}<span class="text-sm font-bold" role="status">{status}</span>{/if}
</span>
