<script>
	// @ts-nocheck
	// Temporary check page for the diorama (replaced by the live view in Task 6).
	import DioramaCanvas from '$lib/components/sim/DioramaCanvas.svelte';
	import { startRun } from '$lib/game/sim/client.js';
	import { defaultSwitches } from '$lib/game/sim/switches.js';
	import { frameAt } from '$lib/game/sim/frame.js';
	import { WIDE } from '$lib/game/sim/camera.js';

	let run = $state();
	let error = $state('');
	$effect(() => {
		startRun({ seed: 1, switches: defaultSwitches(), startYear: 1850, endYear: 2025 })
			.result.then((r) => (run = r))
			.catch((e) => (error = e.message));
	});
	const frame = $derived(run && frameAt(run, 1900.5));
</script>

<main class="h-screen bg-black">
	{#if error}<p class="p-4 text-white">{error}</p>{/if}
	{#if frame}<DioramaCanvas {frame} camera={WIDE} />{/if}
</main>
