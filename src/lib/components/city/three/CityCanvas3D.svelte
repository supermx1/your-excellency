<script>
	// @ts-nocheck
	import { onMount } from 'svelte';
	import { SceneManager } from './SceneManager.js';

	let {
		run,
		selectedBuildingId = $bindable(null),
		onTileClick,
		onTileHover,
		isTheaterMode = $bindable(false)
	} = $props();

	let containerEl = $state(null);
	let canvasEl = $state(null);
	let sceneManager = $state(null);

	let lightingMode = $state('sun'); // 'sun' | 'golden' | 'night'
	let trafficEnabled = $state(true);

	onMount(() => {
		if (!canvasEl) return;

		sceneManager = new SceneManager(canvasEl, run, {
			onTileClick: (tile) => {
				if (onTileClick) onTileClick(tile);
			},
			onTileHover: (tile) => {
				if (onTileHover) onTileHover(tile);
			}
		});

		// Resize observer for responsive canvas
		const resizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const { width, height } = entry.contentRect;
				if (width > 0 && height > 0) {
					sceneManager?.resize(width, height);
				}
			}
		});

		if (containerEl) {
			resizeObserver.observe(containerEl);
		}

		return () => {
			resizeObserver.disconnect();
			sceneManager?.dispose();
		};
	});

	// Reactively update sceneManager state when run or selectedBuildingId changes
	$effect(() => {
		if (sceneManager && run) {
			sceneManager.updateState(run, selectedBuildingId);
		}
	});

	function rotateLeft() {
		sceneManager?.cameraController?.rotateStep(-1);
	}

	function rotateRight() {
		sceneManager?.cameraController?.rotateStep(1);
	}

	function setViewIso() {
		sceneManager?.cameraController?.setIsometricView();
	}

	function setViewTopDown() {
		sceneManager?.cameraController?.setTopDownView();
	}

	function setViewCloseUp() {
		sceneManager?.cameraController?.setCloseUpView();
	}

	function cycleLighting() {
		const modes = ['sun', 'golden', 'night'];
		const next = modes[(modes.indexOf(lightingMode) + 1) % modes.length];
		lightingMode = next;
		sceneManager?.environment?.setLightingMode(next);
	}

	function toggleTraffic() {
		trafficEnabled = !trafficEnabled;
		if (sceneManager?.traffic) {
			sceneManager.traffic.enabled = trafficEnabled;
		}
	}

	function toggleTheater() {
		isTheaterMode = !isTheaterMode;
		// Trigger resize on next tick
		setTimeout(() => {
			if (containerEl && sceneManager) {
				const rect = containerEl.getBoundingClientRect();
				sceneManager.resize(rect.width, rect.height);
			}
		}, 100);
	}

	export function focusTile(x, y) {
		sceneManager?.focusTile(x, y);
	}

	const btn =
		'border-2 border-black font-black uppercase text-xs tracking-wider shadow-[3px_3px_0_0_#000] transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-none bg-white px-2.5 py-1.5 flex items-center gap-1.5 select-none';
</script>

<div
	bind:this={containerEl}
	class={[
		'relative w-full overflow-hidden border-4 border-black bg-amber-50 shadow-[6px_6px_0_0_#000]',
		isTheaterMode ? 'h-[80vh] min-h-[580px]' : 'h-[540px] md:h-[620px]'
	]}
>
	<!-- Three.js Canvas -->
	<canvas bind:this={canvasEl} class="block h-full w-full outline-none"></canvas>

	<!-- Floating 3D Viewport Controls (Top Right) -->
	<div
		class="pointer-events-none absolute right-3 top-3 z-10 flex flex-wrap items-center justify-end gap-2"
	>
		<div
			class="pointer-events-auto flex items-center gap-1 border-2 border-black bg-white/95 p-1 shadow-[3px_3px_0_0_#000]"
		>
			<button
				class="{btn} border-0 shadow-none px-2 py-1"
				onclick={rotateLeft}
				title="Rotate Left (90°)"
			>
				↺
			</button>
			<button
				class="{btn} border-0 shadow-none px-2 py-1"
				onclick={rotateRight}
				title="Rotate Right (90°)"
			>
				↻
			</button>
			<span class="mx-0.5 h-4 w-px bg-black"></span>
			<button
				class="{btn} border-0 shadow-none px-2 py-1"
				onclick={setViewIso}
				title="Isometric 3D Angle"
			>
				Iso
			</button>
			<button
				class="{btn} border-0 shadow-none px-2 py-1"
				onclick={setViewTopDown}
				title="Top-Down Tactical View"
			>
				Top
			</button>
			<button
				class="{btn} border-0 shadow-none px-2 py-1"
				onclick={setViewCloseUp}
				title="Street-Level Close-up"
			>
				Close
			</button>
		</div>

		<!-- Environmental Toggles -->
		<div class="pointer-events-auto flex items-center gap-1.5">
			<button
				class={btn}
				onclick={cycleLighting}
				title="Toggle Lighting (Day / Golden Hour / Night)"
			>
				{#if lightingMode === 'sun'}
					☀️ Sun
				{:else if lightingMode === 'golden'}
					🌅 Sunset
				{:else}
					🌙 Night
				{/if}
			</button>

			<button
				class={[btn, trafficEnabled ? 'bg-yellow-300' : 'bg-zinc-200']}
				onclick={toggleTraffic}
				title="Toggle Road Traffic"
			>
				🚗 {trafficEnabled ? 'Traffic' : 'No Cars'}
			</button>

			<button
				class={[btn, isTheaterMode ? 'bg-emerald-400' : 'bg-white']}
				onclick={toggleTheater}
				title="Toggle Expanded Theater Viewport"
			>
				⛶ {isTheaterMode ? 'Normal' : 'Expand'}
			</button>
		</div>
	</div>

	<!-- Floating Camera Navigation Hint (Bottom Left) -->
	<div
		class="pointer-events-none absolute bottom-3 left-3 z-10 hidden rounded border border-black/60 bg-white/90 px-2 py-1 text-[11px] font-bold text-zinc-700 shadow sm:block"
	>
		🖱️ Drag to Orbit · Shift/Right-drag to Pan · Scroll to Zoom
	</div>
</div>
