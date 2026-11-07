<script>
	// @ts-nocheck
	import { Diorama, DEFAULT_TILT } from './diorama/Diorama.js';

	/**
	 * interactive: map controls (drag to move, right-drag or Shift-drag to turn and tilt, scroll or
	 * pinch to zoom, hover/tap to name a place). onView gets the viewer's new camera; onHover and
	 * onPick get the state under the pointer (or null).
	 */
	let {
		frame,
		camera,
		highlight = null,
		label = 'Map of Nigeria',
		interactive = false,
		popLabels = false,
		onView,
		onHover,
		onPick
	} = $props();

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
		if (!diorama || !frame || !camera) return;
		diorama.popLabels = popLabels;
		diorama.draw(frame, camera, highlight);
	});

	// --- map controls -------------------------------------------------------------
	const pointers = new Map();
	let gesture = null;
	const view = () => ({ target: camera.target, zoom: camera.zoom, yaw: camera.yaw ?? 0, tilt: camera.tilt ?? DEFAULT_TILT });
	const clampZoom = (z) => Math.min(4, Math.max(0.6, z));
	const local = (e) => {
		const r = e.currentTarget.getBoundingClientRect();
		return [e.clientX - r.left, e.clientY - r.top];
	};
	const canControl = () => interactive && diorama && camera?.mode !== 'globe';

	function down(e) {
		if (!canControl()) return;
		e.currentTarget.setPointerCapture(e.pointerId);
		pointers.set(e.pointerId, [e.clientX, e.clientY]);
		const turn = e.button === 2 || e.shiftKey;
		gesture = { start: [e.clientX, e.clientY], last: [e.clientX, e.clientY], moved: false, turn, view: view() };
		if (pointers.size === 2) {
			const [a, b] = [...pointers.values()];
			gesture.pinch = { dist: Math.hypot(a[0] - b[0], a[1] - b[1]), zoom: view().zoom };
		}
	}

	function move(e) {
		if (!canControl()) return;
		if (!gesture) {
			if (e.pointerType === 'mouse') onHover?.(diorama.pick(...local(e)), e.clientX, e.clientY);
			return;
		}
		pointers.set(e.pointerId, [e.clientX, e.clientY]);
		if (Math.hypot(e.clientX - gesture.start[0], e.clientY - gesture.start[1]) > 4) gesture.moved = true;
		if (!gesture.moved) return;
		onHover?.(null);
		if (gesture.pinch && pointers.size === 2) {
			const [a, b] = [...pointers.values()];
			const ratio = Math.hypot(a[0] - b[0], a[1] - b[1]) / gesture.pinch.dist;
			onView?.({ ...view(), zoom: clampZoom(gesture.pinch.zoom * ratio) });
			return;
		}
		const dx = e.clientX - gesture.last[0];
		const dy = e.clientY - gesture.last[1];
		gesture.last = [e.clientX, e.clientY];
		const v = view();
		if (gesture.turn) {
			const tilt = Math.min(1.45, Math.max(0.35, v.tilt + dy * 0.005));
			onView?.({ ...v, yaw: v.yaw - dx * 0.006, tilt });
		} else onView?.({ ...v, target: diorama.panTarget(v, dx, dy) });
	}

	function up(e) {
		pointers.delete(e.pointerId);
		if (gesture && !gesture.moved && canControl()) onPick?.(diorama.pick(...local(e)));
		if (!pointers.size) gesture = null;
	}

	function wheel(e) {
		if (!canControl()) return;
		e.preventDefault();
		onView?.({ ...view(), zoom: clampZoom(view().zoom * Math.exp(-e.deltaY * 0.0015)) });
	}
</script>

{#if interactive}
	<!-- Mouse and touch controls for the map; the same actions are in the playback bar for keyboards. -->
	<div
		class="relative h-full w-full cursor-grab touch-none select-none active:cursor-grabbing"
		role="application"
		aria-label="{label}. Drag to move, right-drag or Shift-drag to turn, scroll or pinch to zoom, click a state for details."
		onpointerdown={down}
		onpointermove={move}
		onpointerup={up}
		onpointercancel={up}
		onpointerleave={() => onHover?.(null)}
		onwheel={wheel}
		oncontextmenu={(e) => e.preventDefault()}
	>
		<canvas {@attach mount} class="block h-full w-full" aria-hidden="true"></canvas>
	</div>
{:else}
	<div class="relative h-full w-full" role="img" aria-label={label}>
		<canvas {@attach mount} class="block h-full w-full" aria-hidden="true"></canvas>
	</div>
{/if}
