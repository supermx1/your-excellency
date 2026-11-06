<script>
	// @ts-nocheck
	import { Diorama } from './diorama/Diorama.js';

	let { frame, camera, label = 'Map of Nigeria' } = $props();

	let diorama = $state();

	/** Creates the renderer on the canvas and keeps it sized to its container. */
	function mount(canvas) {
		const d = new Diorama(canvas, { lowDetail: window.matchMedia('(max-width: 767px)').matches });
		const observer = new ResizeObserver(([entry]) => {
			const { width, height } = entry.contentRect;
			if (width && height) d.resize(width, height);
		});
		observer.observe(canvas.parentElement);
		diorama = d;
		return () => {
			observer.disconnect();
			d.dispose();
			diorama = undefined;
		};
	}

	$effect(() => {
		if (diorama && frame && camera) diorama.draw(frame, camera);
	});
</script>

<div class="relative h-full w-full" role="img" aria-label={label}>
	<canvas {@attach mount} class="block h-full w-full" aria-hidden="true"></canvas>
</div>
