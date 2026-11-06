<script>
	// @ts-nocheck
	import { page } from '$app/state';
	import LiveView from '$lib/components/sim/LiveView.svelte';
	import { decodeInputs } from '$lib/game/sim/inputs.js';

	const decoded = decodeInputs(page.url.searchParams.get('s'));
</script>

<LiveView inputs={decoded.ok ? decoded.inputs : null} loadError={decoded.ok ? '' : decoded.error} />
