<script>
	// @ts-nocheck
	import { buildingCatalog, previewPlacement, tileTypes } from '$lib/game/city/engine.js';
	import { SvelteMap } from 'svelte/reactivity';
	import BuildingSprite from './BuildingSprite.svelte';

	let { run, selectedBuildingId = $bindable(null), onPlace } = $props();

	// True 2:1 isometric projection, done in 2D on purpose.
	//
	// ponytail: this was a CSS-3D board with billboarded sprites, and CSS 3D does
	// not depth-sort a standing plane against the ground planes — tiles in front
	// painted over the sprites and buildings looked half-buried. Projecting in 2D
	// and drawing back-to-front (painter's algorithm) is the standard fix and is
	// both simpler and exact. Rotation becomes a coordinate remap, not a transform.
	// 14x14 is a lot of tiles, so the default tile is small enough that the whole
	// ward fits without scrolling; zoom in for detail.
	const BASE_TILE_W = 38;

	let rotationStep = $state(0);
	let zoomLevel = $state(1);

	const tileW = $derived(BASE_TILE_W * zoomLevel);
	const tileH = $derived(tileW / 2);
	// Tallest artwork reaches y=8 in a 64x72 viewBox whose base sits at y=56, so a
	// sprite can rise 48/64 of a tile width above its tile. That's the top margin.
	const headroom = $derived(tileW * 0.78);
	const boardW = $derived(run.grid.size * tileW);
	const boardH = $derived(headroom + run.grid.size * tileH);

	/** Board rotation as a coordinate remap — one of four 90-degree quarter turns. */
	function displayCoords(x, y) {
		const n = run.grid.size - 1;
		if (rotationStep === 1) return { dx: y, dy: n - x };
		if (rotationStep === 2) return { dx: n - x, dy: n - y };
		if (rotationStep === 3) return { dx: n - y, dy: x };
		return { dx: x, dy: y };
	}

	/** Centre of a tile's diamond, in board pixels. */
	function tileCentre(x, y) {
		const { dx, dy } = displayCoords(x, y);
		return {
			cx: boardW / 2 + (dx - dy) * (tileW / 2),
			cy: headroom + tileH / 2 + (dx + dy) * (tileH / 2),
			depth: dx + dy
		};
	}

	/** Tiles in painter order: furthest back drawn first, so nearer buildings overlap. */
	const placedSprites = $derived(
		run.grid.tiles
			.filter((tile) => tile.buildingId)
			.map((tile) => ({ tile, ...tileCentre(tile.x, tile.y) }))
			.sort((a, b) => a.depth - b.depth || a.cx - b.cx)
	);

	const groundTiles = $derived(
		run.grid.tiles
			.map((tile) => ({ tile, ...tileCentre(tile.x, tile.y) }))
			.sort((a, b) => a.depth - b.depth)
	);

	/** Tile the confirm/reason panel is currently open for (a building is selected).
	 * Only rendered while `selectedBuildingId` is set — see the template guard — so
	 * a stale value left over from a previous selection never leaks into the UI. */
	let pendingTile = $state(null);
	/** Tile the read-only info readout is open for (nothing selected). Same rule:
	 * only rendered while `selectedBuildingId` is unset. */
	let infoTile = $state(null);

	// Precompute a preview per tile whenever a building is selected, so illegal
	// tiles can dim immediately rather than only on tap (per the design doc:
	// "legal tiles highlight, illegal ones dim with a reason").
	const previewMap = $derived.by(() => {
		if (!selectedBuildingId) return null;
		const map = new SvelteMap();
		for (const tile of run.grid.tiles) {
			map.set(`${tile.x},${tile.y}`, previewPlacement(run, selectedBuildingId, tile.x, tile.y));
		}
		return map;
	});

	const pendingPreview = $derived(
		pendingTile && previewMap ? previewMap.get(`${pendingTile.x},${pendingTile.y}`) : null
	);

	function tileAt(x, y) {
		return run.grid.tiles.find((tile) => tile.x === x && tile.y === y) || null;
	}

	function tileClick(tile) {
		if (selectedBuildingId) {
			pendingTile = { x: tile.x, y: tile.y };
		} else {
			infoTile = infoTile?.x === tile.x && infoTile?.y === tile.y ? null : { x: tile.x, y: tile.y };
		}
	}

	function confirmPlacement() {
		if (!pendingTile || !selectedBuildingId) return;
		onPlace(selectedBuildingId, pendingTile.x, pendingTile.y);
		pendingTile = null;
		selectedBuildingId = null;
	}

	function cancelPending() {
		pendingTile = null;
	}

	function rotate() {
		rotationStep = (rotationStep + 1) % 4;
	}

	function zoomIn() {
		zoomLevel = Math.min(1.6, Math.round((zoomLevel + 0.15) * 100) / 100);
	}

	function zoomOut() {
		zoomLevel = Math.max(0.6, Math.round((zoomLevel - 0.15) * 100) / 100);
	}

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

	const card = 'border-4 border-black bg-white shadow-[6px_6px_0_0_#000]';
	const btn =
		'border-2 border-black font-black uppercase tracking-wide shadow-[4px_4px_0_0_#000] transition active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-40 disabled:shadow-none';
</script>

<section class="{card} min-w-0 p-4">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<h2 class="text-xl font-black uppercase">The constituency</h2>
		<div class="flex gap-2">
			<button class="{btn} grid size-9 place-items-center bg-white" onclick={rotate} title="Rotate">
				↻
			</button>
			<button
				class="{btn} grid size-9 place-items-center bg-white"
				onclick={zoomOut}
				title="Zoom out"
			>
				−
			</button>
			<button
				class="{btn} grid size-9 place-items-center bg-white"
				onclick={zoomIn}
				title="Zoom in"
			>
				+
			</button>
		</div>
	</div>

	<div class="iso-stage mt-3 overflow-x-auto">
		<div class="flex justify-center" style="min-width: {boardW}px;">
			<div class="relative" style="width: {boardW}px; height: {boardH}px;">
				<!-- Ground: one SVG so the diamonds keep crisp strokes and stay hit-testable. -->
				<svg
					class="absolute inset-0"
					width={boardW}
					height={boardH}
					viewBox="0 0 {boardW} {boardH}"
					role="group"
					aria-label="Constituency map, {run.grid.size} by {run.grid.size} tiles"
				>
					{#each groundTiles as { tile, cx, cy } (tile.x + ',' + tile.y)}
						{@const terrain = tileTypes[tile.type]}
						{@const preview = previewMap?.get(`${tile.x},${tile.y}`)}
						{@const legal = !selectedBuildingId || preview?.ok}
						{@const isPending = pendingTile?.x === tile.x && pendingTile?.y === tile.y}
						{@const isInfo = infoTile?.x === tile.x && infoTile?.y === tile.y}
						<polygon
							points="{cx},{cy - tileH / 2} {cx + tileW / 2},{cy} {cx},{cy + tileH / 2} {cx -
								tileW / 2},{cy}"
							fill={terrain.fill}
							fill-opacity={selectedBuildingId && !legal ? 0.35 : 1}
							stroke={isPending || isInfo
								? '#000'
								: selectedBuildingId && legal
									? '#059669'
									: '#000'}
							stroke-width={isPending || isInfo ? 3 : selectedBuildingId && legal ? 2 : 0.8}
							style="cursor: {selectedBuildingId && !legal ? 'not-allowed' : 'pointer'};"
							role="button"
							tabindex="0"
							aria-label="{terrain.label} tile ({tile.x}, {tile.y}){tile.buildingId
								? `, ${buildingCatalog[tile.buildingId].label}`
								: ''}"
							onclick={() => tileClick(tile)}
							onkeydown={(e) => e.key === 'Enter' && tileClick(tile)}
						/>
					{/each}
				</svg>

				<!-- Buildings, painted back-to-front so nearer ones overlap the ones behind.
				     Each sprite's base diamond sits at 56/72 down its 64x72 artwork, so it is
				     offset by half a tile width across and 0.875 of one down. -->
				<div class="pointer-events-none absolute inset-0">
					{#each placedSprites as { tile, cx, cy } (tile.x + ',' + tile.y)}
						<div class="absolute" style="left: {cx - tileW / 2}px; top: {cy - tileW * 0.875}px;">
							<BuildingSprite
								id={tile.buildingId}
								size={tileW}
								underConstruction={tile.turnsLeft > 0}
							/>
							{#if tile.turnsLeft > 0}
								<span
									class="absolute left-1/2 top-0 -translate-x-1/2 border border-black bg-yellow-300 px-1 text-[10px] font-black leading-tight"
								>
									{tile.turnsLeft}
								</span>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>

	<div class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold text-zinc-600">
		{#each Object.entries(tileTypes) as [type, t] (type)}
			<span class="inline-flex items-center gap-1">
				<span class="inline-block size-3 border border-black {t.colorClass}"></span>
				{t.label}
			</span>
		{/each}
	</div>

	<div class="mt-3">
		{#if selectedBuildingId}
			{#if pendingTile && pendingPreview?.ok}
				<div class="border-4 border-black bg-amber-50 p-3 shadow-[5px_5px_0_0_#000]">
					<p class="font-black uppercase">
						{buildingCatalog[selectedBuildingId].label} at ({pendingTile.x}, {pendingTile.y})
					</p>
					<p class="mt-1 text-sm font-bold">Cost: {naira(pendingPreview.cost)}</p>
					{#if pendingPreview.terrainNote}
						<p class="mt-1 text-sm font-medium">{pendingPreview.terrainNote}</p>
					{/if}
					{#if pendingPreview.adjacencyNote}
						<p class="mt-1 text-sm font-medium">{pendingPreview.adjacencyNote}</p>
					{/if}
					<div class="mt-3 flex gap-2">
						<button class="{btn} bg-emerald-400 px-4 py-2" onclick={confirmPlacement}
							>Confirm</button
						>
						<button class="{btn} bg-white px-4 py-2" onclick={cancelPending}>Cancel</button>
					</div>
				</div>
			{:else if pendingTile}
				<div class="border-4 border-black bg-rose-300 p-3 shadow-[5px_5px_0_0_#000]">
					<p class="font-black uppercase">Can't build there</p>
					<p class="mt-1 text-sm font-medium">{pendingPreview?.reason}</p>
					<button class="{btn} mt-3 bg-white px-4 py-2" onclick={cancelPending}>Dismiss</button>
				</div>
			{:else}
				<p class="text-sm font-medium text-zinc-600">
					Tap a tile to preview and confirm placement.
				</p>
			{/if}
		{:else if infoTile}
			{@const tile = tileAt(infoTile.x, infoTile.y)}
			{@const terrain = tileTypes[tile.type]}
			<div class="border-4 border-black bg-white p-3 shadow-[5px_5px_0_0_#000]">
				<p class="font-black uppercase">{terrain.label} · ({tile.x}, {tile.y})</p>
				<p class="mt-1 text-sm font-medium">{terrain.description}</p>
				{#if tile.buildingId}
					<p class="mt-2 text-sm font-black">{buildingCatalog[tile.buildingId].label}</p>
					<p class="text-sm font-medium">{buildingCatalog[tile.buildingId].blurb}</p>
					{#if tile.turnsLeft > 0}
						<p class="mt-1 text-sm font-black text-amber-700">
							Under construction — {tile.turnsLeft} turn{tile.turnsLeft === 1 ? '' : 's'} left. It delivers
							nothing until it opens.
						</p>
					{/if}
				{:else}
					<p class="mt-2 text-sm font-medium text-zinc-600">Nothing built here yet.</p>
				{/if}
			</div>
		{:else}
			<p class="text-sm font-medium text-zinc-600">
				Select a building from the palette, then tap a tile to place it — or tap any tile to inspect
				it.
			</p>
		{/if}
	</div>
</section>
