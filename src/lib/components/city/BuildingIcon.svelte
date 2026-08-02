<script>
	// @ts-nocheck
	// Hand-authored glyph per building. Drawn to read at ~26px on a tilted
	// isometric block: 4-6 strokes each, white fill + black stroke so they stay
	// legible on top of any sector colour.
	// ponytail: an {#if} chain instead of a path-string map — a map would need
	// {@html} to render, and this stays plain, safe markup.
	let { id, size = 26 } = $props();
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="#fff"
	stroke="#000"
	stroke-width="2"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	{#if id === 'borehole'}
		<!-- hand pump: plinth, riser, handle, spout -->
		<rect x="6" y="17" width="12" height="3" />
		<path d="M12 17V7" fill="none" />
		<path d="M12 8l5-3" fill="none" />
		<path d="M12 11h4" fill="none" />
	{:else if id === 'water_works'}
		<!-- treatment tank with a waterline -->
		<rect x="4" y="8" width="16" height="12" rx="1" />
		<path d="M4 12h16" fill="none" />
		<path d="M7 16c1.7-1.4 3.3 1.4 5 0s3.3 1.4 5 0" fill="none" />
	{:else if id === 'solar_minigrid'}
		<!-- panel array under a sun -->
		<circle cx="5.5" cy="5" r="2.5" />
		<rect x="3" y="11" width="18" height="7" />
		<path d="M9 11v7M15 11v7M3 14.5h18" fill="none" />
		<path d="M12 18v2" fill="none" />
	{:else if id === 'transformer'}
		<!-- substation box with a bolt -->
		<rect x="6" y="5" width="12" height="12" rx="1" />
		<path d="M9 17v3M15 17v3" fill="none" />
		<path d="M13.5 7.5L10 12h3.5L12.5 15" fill="none" />
	{:else if id === 'primary_school'}
		<!-- pitched roof, flag, doorway -->
		<path d="M3 11l9-6 9 6" fill="none" />
		<rect x="5" y="11" width="14" height="9" />
		<path d="M10.5 20v-4h3v4" fill="none" />
		<path d="M12 5V2h3.5" fill="none" />
	{:else if id === 'clinic'}
		<!-- single-storey health post -->
		<rect x="5" y="9" width="14" height="11" />
		<path d="M12 12v5M9.5 14.5h5" fill="none" />
	{:else if id === 'hospital'}
		<!-- multi-storey, cross above a ward row -->
		<rect x="4" y="5" width="16" height="15" />
		<path d="M12 7v4M10 9h4" fill="none" />
		<path d="M7 14h2M11 14h2M15 14h2M7 17h2M11 17h2M15 17h2" fill="none" />
	{:else if id === 'road'}
		<!-- carriageway with centre markings -->
		<rect x="2" y="9" width="20" height="7" />
		<path d="M5 12.5h3M11 12.5h3M17 12.5h2" fill="none" />
	{:else if id === 'police_post'}
		<!-- shield -->
		<path d="M12 3l7 3v6c0 4.2-3 6.7-7 8-4-1.3-7-3.8-7-8V6z" />
		<path d="M9 11.5l2 2 4-4" fill="none" />
	{:else if id === 'housing_estate'}
		<!-- a row of pitched roofs -->
		<path d="M2 20v-6l4.5-3.5L11 14v6z" />
		<path d="M13 20v-7.5l4.5-3.5L22 12.5V20z" />
	{:else if id === 'market'}
		<!-- stall canopy over a counter -->
		<path d="M3 8h18l-2 3.5H5z" />
		<path d="M5 11.5l2 2 2-2 2 2 2-2 2 2 2-2" fill="none" />
		<path d="M6 14v6M18 14v6M6 20h12" fill="none" />
	{:else if id === 'waste_depot'}
		<!-- refuse skip with a drainage grate -->
		<path d="M4 9h16l-2 9H6Z" />
		<path d="M4 9h16" fill="none" />
		<path d="M9 6h6l1 3H8Z" />
		<path d="M8 13h8M9 16h6" fill="none" />
	{:else if id === 'business_hub'}
		<!-- office block, window grid -->
		<rect x="6" y="4" width="12" height="16" />
		<path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2" fill="none" />
	{/if}
</svg>
