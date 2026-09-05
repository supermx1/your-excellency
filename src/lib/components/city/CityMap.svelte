<script>
	// @ts-nocheck
	import { buildingCatalog, previewPlacement, tileTypes } from '$lib/game/city/engine.js';
	import { SvelteMap } from 'svelte/reactivity';
	import BuildingSprite from './BuildingSprite.svelte';
	import CityCanvas3D from './three/CityCanvas3D.svelte';

	let {
		run,
		selectedBuildingId = $bindable(null),
		onPlace,
		isTheaterMode = $bindable(false)
	} = $props();

	let viewMode = $state('3d'); // '3d' | '2d'
	let canvas3dRef = $state(null);

	// 2D SVG Isometric Fallback Variables
	const BASE_TILE_W = 38;
	let rotationStep = $state(0);
	let zoomLevel = $state(1);

	const tileW = $derived(BASE_TILE_W * zoomLevel);
	const tileH = $derived(tileW / 2);
	const headroom = $derived(tileW * 0.78);
	const boardW = $derived(run.grid.size * tileW);
	const boardH = $derived(headroom + run.grid.size * tileH);

	function displayCoords(x, y) {
		const n = run.grid.size - 1;
		if (rotationStep === 1) return { dx: y, dy: n - x };
		if (rotationStep === 2) return { dx: n - x, dy: n - y };
		if (rotationStep === 3) return { dx: n - y, dy: x };
		return { dx: x, dy: y };
	}

	function tileCentre(x, y) {
		const { dx, dy } = displayCoords(x, y);
		return {
			cx: boardW / 2 + (dx - dy) * (tileW / 2),
			cy: headroom + tileH / 2 + (dx + dy) * (tileH / 2),
			depth: dx + dy
		};
	}

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

	let pendingTile = $state(null);
	let infoTile = $state(null);

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
			if (infoTile && canvas3dRef?.focusTile) {
				canvas3dRef.focusTile(tile.x, tile.y);
			}
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
		'border-2 border-black font-black uppercase tracking-wide shadow-[4px_4px_0_0_#000] transition active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-40 disabled:shadow-none text-xs';
</script>

<section class="{card} min-w-0 p-4">
	<!-- Map Header Bar -->
	<div class="flex flex-wrap items-center justify-between gap-3 border-b-2 border-black pb-3">
		<div class="flex items-center gap-2">
			<h2 class="text-xl font-black uppercase">The Constituency</h2>
			<span
				class="rounded border border-black bg-emerald-300 px-2 py-0.5 text-[10px] font-black uppercase"
			>
				{viewMode === '3d' ? '3D Strategy World' : 'Classic 2D'}
			</span>
		</div>

		<div class="flex flex-wrap items-center gap-2">
			<!-- Mode Toggle: 3D vs 2D -->
			<div class="flex border-2 border-black shadow-[2px_2px_0_0_#000]">
				<button
					class="px-2.5 py-1 text-xs font-black uppercase transition {viewMode === '3d'
						? 'bg-yellow-300 text-black'
						: 'bg-white text-zinc-600'}"
					onclick={() => (viewMode = '3d')}
					title="Switch to Full 3D View"
				>
					🌐 3D World
				</button>
				<button
					class="border-l-2 border-black px-2.5 py-1 text-xs font-black uppercase transition {viewMode ===
					'2d'
						? 'bg-yellow-300 text-black'
						: 'bg-white text-zinc-600'}"
					onclick={() => (viewMode = '2d')}
					title="Switch to 2D Isometric View"
				>
					📐 2D Classic
				</button>
			</div>

			{#if viewMode === '2d'}
				<div class="flex gap-1">
					<button
						class="{btn} size-8 p-0 bg-white grid place-items-center"
						onclick={rotate}
						title="Rotate 90°"
					>
						↻
					</button>
					<button
						class="{btn} size-8 p-0 bg-white grid place-items-center"
						onclick={zoomOut}
						title="Zoom out"
					>
						−
					</button>
					<button
						class="{btn} size-8 p-0 bg-white grid place-items-center"
						onclick={zoomIn}
						title="Zoom in"
					>
						+
					</button>
				</div>
			{/if}
		</div>
	</div>

	<!-- Main Map Viewport Area -->
	<div class="mt-3">
		{#if viewMode === '3d'}
			<CityCanvas3D
				bind:this={canvas3dRef}
				{run}
				bind:selectedBuildingId
				onTileClick={tileClick}
				bind:isTheaterMode
			/>
		{:else}
			<div class="iso-stage overflow-x-auto rounded border-4 border-black bg-amber-50 p-2">
				<div class="flex justify-center" style="min-width: {boardW}px;">
					<div class="relative" style="width: {boardW}px; height: {boardH}px;">
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

						<div class="pointer-events-none absolute inset-0">
							{#each placedSprites as { tile, cx, cy } (tile.x + ',' + tile.y)}
								<div
									class="absolute"
									style="left: {cx - tileW / 2}px; top: {cy - tileW * 0.875}px;"
								>
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
		{/if}
	</div>

	<!-- Terrain Legend Strip -->
	<div class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold text-zinc-600">
		{#each Object.entries(tileTypes) as [type, t] (type)}
			<span class="inline-flex items-center gap-1">
				<span class="inline-block size-3 border border-black {t.colorClass}"></span>
				{t.label}
			</span>
		{/each}
	</div>

	<!-- Placement Preview / Tile Info Panel -->
	<div class="mt-3">
		{#if selectedBuildingId}
			{#if pendingTile && pendingPreview?.ok}
				<div class="border-4 border-black bg-emerald-100 p-4 shadow-[5px_5px_0_0_#000]">
					<div class="flex flex-wrap items-center justify-between gap-2">
						<p class="font-black uppercase text-base">
							🏗️ Build {buildingCatalog[selectedBuildingId].label} at ({pendingTile.x}, {pendingTile.y})
						</p>
						<span class="rounded border border-black bg-emerald-400 px-2 py-0.5 text-xs font-black">
							Cost: {naira(pendingPreview.cost)}
						</span>
					</div>
					{#if pendingPreview.terrainNote}
						<p class="mt-1 text-sm font-medium text-emerald-950">{pendingPreview.terrainNote}</p>
					{/if}
					{#if pendingPreview.adjacencyNote}
						<p class="mt-1 text-sm font-medium text-emerald-950">{pendingPreview.adjacencyNote}</p>
					{/if}
					<div class="mt-3 flex gap-2">
						<button class="{btn} bg-emerald-400 px-4 py-2" onclick={confirmPlacement}>
							Confirm Construction →
						</button>
						<button class="{btn} bg-white px-4 py-2" onclick={cancelPending}>Cancel</button>
					</div>
				</div>
			{:else if pendingTile}
				<div class="border-4 border-black bg-rose-300 p-4 shadow-[5px_5px_0_0_#000]">
					<p class="font-black uppercase text-base">⚠️ Can't build there</p>
					<p class="mt-1 text-sm font-medium">{pendingPreview?.reason}</p>
					<button class="{btn} mt-3 bg-white px-4 py-2" onclick={cancelPending}>Dismiss</button>
				</div>
			{:else}
				<div
					class="border-2 border-dashed border-zinc-400 bg-amber-50/70 p-3 text-sm font-medium text-zinc-700"
				>
					🎯 <span class="font-bold">{buildingCatalog[selectedBuildingId].label}</span> selected. Hover
					over tiles to see the 3D ghost preview, then tap any tile to confirm placement.
				</div>
			{/if}
		{:else if infoTile}
			{@const tile = tileAt(infoTile.x, infoTile.y)}
			{@const terrain = tileTypes[tile.type]}
			<div class="border-4 border-black bg-white p-4 shadow-[5px_5px_0_0_#000]">
				<div class="flex items-center justify-between">
					<p class="font-black uppercase text-base">{terrain.label} · ({tile.x}, {tile.y})</p>
					<button
						class="{btn} bg-zinc-100 px-2 py-0.5 text-[11px]"
						onclick={() => (infoTile = null)}
					>
						✕ Close
					</button>
				</div>
				<p class="mt-1 text-sm font-medium text-zinc-700">{terrain.description}</p>
				{#if tile.buildingId}
					<div class="mt-3 border-t-2 border-black pt-2">
						<p class="text-sm font-black">{buildingCatalog[tile.buildingId].label}</p>
						<p class="text-xs font-medium text-zinc-600">
							{buildingCatalog[tile.buildingId].blurb}
						</p>
						{#if tile.turnsLeft > 0}
							<p class="mt-1 text-xs font-black text-amber-700">
								🚧 Under construction — {tile.turnsLeft} turn{tile.turnsLeft === 1 ? '' : 's'} left. Contributes
								0 capacity until completed.
							</p>
						{:else}
							<p class="mt-1 text-xs font-bold text-emerald-700">
								✓ Operational: +{buildingCatalog[tile.buildingId].capacity} capacity · Upkeep {naira(
									buildingCatalog[tile.buildingId].maintenance
								)}/turn
							</p>
						{/if}
					</div>
				{:else}
					<p class="mt-2 text-sm font-medium text-zinc-500">
						Empty plot. Select a building from the palette to develop this tile.
					</p>
				{/if}
			</div>
		{:else}
			<p class="text-xs font-medium text-zinc-600">
				Select a building from the palette, then tap a tile to place it — or tap any tile to inspect
				it.
			</p>
		{/if}
	</div>
</section>
