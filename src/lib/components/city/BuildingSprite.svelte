<script>
	// @ts-nocheck
	// Isometric building sprites, drawn in a 2:1 projection that matches the
	// board's own tile rhombus (rotateX(55deg) squashes a square to ~1:0.57).
	//
	// Geometry convention: the tile footprint is the diamond
	//   L(0,56)  T(32,40)  R(64,56)  B(32,72)
	// A footprint scaled by s about the centre (32,56) gives
	//   L(32-32s, 56)  T(32, 56-16s)  R(32+32s, 56)  B(32, 56+16s)
	// and a mass of height h lifts those points by -h. Faces are drawn
	// left, right, then top so the roof always reads on top.
	//
	// Shading is flat, three tones per material (top lightest, left mid,
	// right darkest) with black outlines — same language as the rest of the site.
	let { id, size = 66, underConstruction = false } = $props();
</script>

<svg
	width={size}
	height={(size * 72) / 64}
	viewBox="0 0 64 72"
	fill="none"
	stroke="#000"
	stroke-linejoin="round"
	stroke-linecap="round"
	aria-hidden="true"
>
	<!-- contact shadow, grounds the mass on the tile -->
	<ellipse cx="32" cy="60" rx="26" ry="12" fill="#000" opacity="0.16" stroke="none" />

	{#if underConstruction}
		<!-- A site, not a building: foundation slab, scaffold poles and a hazard board.
		     Deliberately the same silhouette for every building so an unfinished plot
		     reads as "nothing works here yet" at a glance. -->
		<g stroke-width="2">
			<path d="M4.8 54 L32 67.6 L32 69.6 L4.8 56 Z" fill="#a8a29e" />
			<path d="M32 67.6 L59.2 54 L59.2 56 L32 69.6 Z" fill="#78716c" />
			<path d="M4.8 54 L32 40.4 L59.2 54 L32 67.6 Z" fill="#d6d3d1" />
		</g>
		<g stroke-width="1.6" stroke="#78350f">
			<path d="M14 49 V33 M50 49 V33 M32 62 V46" />
			<path d="M14 33 L32 42 L50 33" fill="none" />
			<path d="M14 41 L32 50 L50 41" fill="none" />
		</g>
		<g stroke-width="1.4">
			<path d="M20 30 L38 21 L44 24 L26 33 Z" fill="#facc15" />
			<path d="M25 29.5 L28.5 27.8 M31 26.5 L34.5 24.8" stroke="#000" stroke-width="2" />
		</g>
	{:else if id === 'borehole'}
		<g stroke-width="2">
			<path d="M14.4 50 L32 58.8 L32 64.8 L14.4 56 Z" fill="#cbd5e1" />
			<path d="M32 58.8 L49.6 50 L49.6 56 L32 64.8 Z" fill="#94a3b8" />
			<path d="M14.4 50 L32 41.2 L49.6 50 L32 58.8 Z" fill="#e2e8f0" />
		</g>
		<g stroke-width="2.6" stroke="#1e293b">
			<path d="M32 49 V31" />
			<path d="M32 34 L43 28.5" />
		</g>
		<g stroke-width="1.6">
			<path d="M32 40 h8 v3" stroke="#1e293b" />
			<path d="M36.5 45 h7.5 l-1.2 6 h-5.1 Z" fill="#38bdf8" />
		</g>
	{:else if id === 'water_works'}
		<g stroke-width="2">
			<path d="M8 52 L32 64 L32 68 L8 56 Z" fill="#cbd5e1" />
			<path d="M32 64 L56 52 L56 56 L32 68 Z" fill="#94a3b8" />
			<path d="M8 52 L32 40 L56 52 L32 64 Z" fill="#e2e8f0" />
			<path d="M15 34 V50 a17 8.5 0 0 0 34 0 V34 Z" fill="#0ea5e9" />
			<ellipse cx="32" cy="34" rx="17" ry="8.5" fill="#7dd3fc" />
		</g>
		<g stroke-width="1.2">
			<path d="M15 42 a17 8.5 0 0 0 34 0" />
			<path d="M39 39.5 V54 M44 38.5 V53" stroke="#0369a1" />
			<path d="M39.6 43 H43.6 M39.4 47 H43.4 M39.2 51 H43.2" stroke="#0369a1" />
		</g>
	{:else if id === 'solar_minigrid'}
		<g stroke-width="2">
			<path d="M4.8 53 L32 66.6 L32 69.6 L4.8 56 Z" fill="#cbd5e1" />
			<path d="M32 66.6 L59.2 53 L59.2 56 L32 69.6 Z" fill="#94a3b8" />
			<path d="M4.8 53 L32 39.4 L59.2 53 L32 66.6 Z" fill="#e2e8f0" />
		</g>
		<g stroke-width="1.6" stroke="#0f172a">
			<path d="M28 52 V58 M42.5 45.5 V51.5 M12 47 V53" />
		</g>
		<g stroke-width="2">
			<path d="M8 45 L24 37 L44 44 L28 52 Z" fill="#1d4ed8" />
			<path d="M22 38 L38 30 L58 37 L42 45 Z" fill="#1e40af" />
		</g>
		<g stroke-width="1" stroke="#93c5fd">
			<path d="M14.5 41.8 L34.6 48.9 M18.8 39.6 L38.9 46.7" />
			<path d="M28.5 34.8 L48.6 41.9 M32.8 32.6 L52.9 39.7" />
		</g>
	{:else if id === 'transformer'}
		<g stroke-width="2">
			<path d="M12.8 53 L32 62.6 L32 65.6 L12.8 56 Z" fill="#cbd5e1" />
			<path d="M32 62.6 L51.2 53 L51.2 56 L32 65.6 Z" fill="#94a3b8" />
			<path d="M12.8 53 L32 43.4 L51.2 53 L32 62.6 Z" fill="#e2e8f0" />
			<path d="M17.6 40 L32 47.2 L32 61.2 L17.6 54 Z" fill="#eab308" />
			<path d="M32 47.2 L46.4 40 L46.4 54 L32 61.2 Z" fill="#ca8a04" />
			<path d="M17.6 40 L32 32.8 L46.4 40 L32 47.2 Z" fill="#facc15" />
		</g>
		<g stroke-width="1.4">
			<path d="M24 36.4 V31 M32 32.4 V27 M40 36.4 V31" stroke="#475569" />
			<ellipse cx="24" cy="30.6" rx="2.6" ry="1.3" fill="#cbd5e1" />
			<ellipse cx="32" cy="26.6" rx="2.6" ry="1.3" fill="#cbd5e1" />
			<ellipse cx="40" cy="30.6" rx="2.6" ry="1.3" fill="#cbd5e1" />
			<path d="M39 45 l-4.5 6.5 h4 l-1 5.5" fill="none" stroke="#1c1917" stroke-width="1.8" />
		</g>
	{:else if id === 'primary_school'}
		<g stroke-width="2">
			<path d="M3.2 42 L32 56.4 L32 70.4 L3.2 56 Z" fill="#fde68a" />
			<path d="M32 56.4 L60.8 42 L60.8 56 L32 70.4 Z" fill="#f59e0b" />
			<path d="M3.2 42 L32 56.4 L32 26 Z" fill="#dc2626" />
			<path d="M32 56.4 L60.8 42 L32 26 Z" fill="#b91c1c" />
		</g>
		<g stroke-width="1.2">
			<path d="M11 47.5 L18 51 L18 58 L11 54.5 Z" fill="#bae6fd" />
			<path d="M21 52.5 L28 56 L28 63 L21 59.5 Z" fill="#bae6fd" />
			<path d="M37 56.5 L44 53 L44 60 L37 63.5 Z" fill="#bae6fd" />
			<path d="M49 50.5 L55.5 47.2 L55.5 56.2 L49 59.5 Z" fill="#7c2d12" />
		</g>
		<g stroke-width="1.6">
			<path d="M8 45 V23" stroke="#78350f" />
			<path d="M8 23 L18 26 L8 29 Z" fill="#16a34a" />
		</g>
	{:else if id === 'clinic'}
		<g stroke-width="2">
			<path d="M8 43 L32 55 L32 68 L8 56 Z" fill="#e2e8f0" />
			<path d="M32 55 L56 43 L56 56 L32 68 Z" fill="#cbd5e1" />
			<path d="M8 43 L32 31 L56 43 L32 55 Z" fill="#f8fafc" />
		</g>
		<g stroke-width="1.4">
			<path d="M38.6 49.3 L44.6 46.3 L25.4 36.7 L19.4 39.7 Z" fill="#ef4444" />
			<path d="M25.4 49.3 L19.4 46.3 L38.6 36.7 L44.6 39.7 Z" fill="#ef4444" />
		</g>
		<g stroke-width="1.2">
			<path d="M14 47.5 L20 50.5 L20 56.5 L14 53.5 Z" fill="#bae6fd" />
			<path d="M23 52 L29 55 L29 61 L23 58 Z" fill="#bae6fd" />
			<path d="M44 52 L50 49 L50 57.5 L44 60.5 Z" fill="#0f766e" />
		</g>
	{:else if id === 'hospital'}
		<g stroke-width="2">
			<path d="M4.8 26 L32 39.6 L32 69.6 L4.8 56 Z" fill="#e2e8f0" />
			<path d="M32 39.6 L59.2 26 L59.2 56 L32 69.6 Z" fill="#cbd5e1" />
			<path d="M4.8 26 L32 12.4 L59.2 26 L32 39.6 Z" fill="#f8fafc" />
		</g>
		<g stroke-width="1.1" fill="#7dd3fc">
			<path d="M9 30 L16 33.5 L16 39 L9 35.5 Z" />
			<path d="M18 34.5 L25 38 L25 43.5 L18 40 Z" />
			<path d="M9 40 L16 43.5 L16 49 L9 45.5 Z" />
			<path d="M18 44.5 L25 48 L25 53.5 L18 50 Z" />
			<path d="M39 38 L46 34.5 L46 40 L39 43.5 Z" />
			<path d="M48 33.5 L55 30 L55 35.5 L48 39 Z" />
			<path d="M39 48 L46 44.5 L46 50 L39 53.5 Z" />
			<path d="M48 43.5 L55 40 L55 45.5 L48 49 Z" />
		</g>
		<g stroke-width="1.3">
			<path d="M37.4 24 L42.6 21.4 L26.6 13.4 L21.4 16 Z" fill="#ef4444" />
			<path d="M26.6 24 L21.4 21.4 L37.4 13.4 L42.6 16 Z" fill="#ef4444" />
			<path d="M28 58 L36 54 L36 63.5 L28 67.5 Z" fill="#0f766e" />
		</g>
	{:else if id === 'road'}
		<g stroke-width="2">
			<path d="M0 56 L32 40 L64 56 L32 72 Z" fill="#475569" />
		</g>
		<g stroke-width="1.4" stroke="#facc15" stroke-dasharray="5 4">
			<path d="M6 56 H58" />
		</g>
		<g stroke-width="1" stroke="#94a3b8">
			<path d="M16 48 L48 64 M16 64 L48 48" />
		</g>
	{:else if id === 'police_post'}
		<g stroke-width="2">
			<path d="M9.6 40 L32 51.2 L32 67.2 L9.6 56 Z" fill="#3b82f6" />
			<path d="M32 51.2 L54.4 40 L54.4 56 L32 67.2 Z" fill="#1d4ed8" />
			<path d="M9.6 40 L32 28.8 L54.4 40 L32 51.2 Z" fill="#93c5fd" />
		</g>
		<g stroke-width="1.1">
			<path d="M32 55.6 L54.4 44.4 L54.4 48.4 L32 59.6 Z" fill="#f8fafc" />
			<path d="M36 57.6 L42 54.6 L42 58.6 L36 61.6 Z" fill="#1e3a8a" stroke="none" />
			<path d="M46 52.6 L52 49.6 L52 53.6 L46 56.6 Z" fill="#1e3a8a" stroke="none" />
			<path d="M15 45.5 L21 48.5 L21 55 L15 52 Z" fill="#bae6fd" />
			<path d="M24 50 L30 53 L30 62 L24 59 Z" fill="#1e3a8a" />
		</g>
		<g stroke-width="1.6">
			<path d="M32 33 V19" stroke="#0f172a" />
			<circle cx="32" cy="17.4" r="2.2" fill="#ef4444" />
		</g>
	{:else if id === 'housing_estate'}
		<!-- three cottages, drawn back-to-front so they overlap correctly -->
		<g stroke-width="1.8">
			<path d="M34 42 L44 47 L44 55 L34 50 Z" fill="#fdba74" />
			<path d="M44 47 L54 42 L54 50 L44 55 Z" fill="#fb923c" />
			<path d="M34 42 L44 47 L44 36 Z" fill="#ea580c" />
			<path d="M44 47 L54 42 L44 36 Z" fill="#c2410c" />

			<path d="M8 44 L18 49 L18 57 L8 52 Z" fill="#fdba74" />
			<path d="M18 49 L28 44 L28 52 L18 57 Z" fill="#fb923c" />
			<path d="M8 44 L18 49 L18 38 Z" fill="#ea580c" />
			<path d="M18 49 L28 44 L18 38 Z" fill="#c2410c" />

			<path d="M21 54 L31 59 L31 67 L21 62 Z" fill="#fdba74" />
			<path d="M31 59 L41 54 L41 62 L31 67 Z" fill="#fb923c" />
			<path d="M21 54 L31 59 L31 48 Z" fill="#ea580c" />
			<path d="M31 59 L41 54 L31 48 Z" fill="#c2410c" />
		</g>
		<g stroke-width="0.9">
			<path d="M33.5 61 L37 59.3 L37 64.3 L33.5 66 Z" fill="#7c2d12" />
			<path d="M20.5 51 L24 49.3 L24 54.3 L20.5 56 Z" fill="#7c2d12" />
			<path d="M46.5 49 L50 47.3 L50 52.3 L46.5 54 Z" fill="#7c2d12" />
		</g>
	{:else if id === 'market'}
		<g stroke-width="2">
			<path d="M4.8 54 L32 67.6 L32 69.6 L4.8 56 Z" fill="#cbd5e1" />
			<path d="M32 67.6 L59.2 54 L59.2 56 L32 69.6 Z" fill="#94a3b8" />
			<path d="M4.8 54 L32 40.4 L59.2 54 L32 67.6 Z" fill="#e2e8f0" />
		</g>
		<g stroke-width="1.4" stroke="#78350f">
			<path d="M8 44 V57 M36 44 V57 M22 51 V64" />
		</g>
		<g stroke-width="2">
			<path d="M8 44 L22 37 L36 44 L22 51 Z" fill="#f8fafc" />
		</g>
		<g stroke-width="0.9" stroke="#991b1b">
			<path d="M10.8 42.6 L13.6 41.2 L27.6 48.2 L24.8 49.6 Z" fill="#dc2626" />
			<path d="M16.4 39.8 L19.2 38.4 L33.2 45.4 L30.4 46.8 Z" fill="#dc2626" />
		</g>
		<g stroke-width="1.3" stroke="#78350f">
			<path d="M40 47 V57 M56 47 V57 M48 51 V61" />
		</g>
		<g stroke-width="1.8">
			<path d="M40 47 L48 43 L56 47 L48 51 Z" fill="#fef3c7" />
		</g>
		<g stroke-width="1">
			<path d="M25 57 L31 60 L31 65 L25 62 Z" fill="#a16207" />
			<path d="M31 60 L37 57 L37 62 L31 65 Z" fill="#854d0e" />
			<path d="M25 57 L31 54 L37 57 L31 60 Z" fill="#ca8a04" />
		</g>
	{:else if id === 'waste_depot'}
		<g stroke-width="2">
			<path d="M4.8 53 L32 66.6 L32 69.6 L4.8 56 Z" fill="#a8a29e" />
			<path d="M32 66.6 L59.2 53 L59.2 56 L32 69.6 Z" fill="#78716c" />
			<path d="M4.8 53 L32 39.4 L59.2 53 L32 66.6 Z" fill="#d6d3d1" />
		</g>
		<!-- shed -->
		<g stroke-width="1.8">
			<path d="M8 42 L20 48 L20 58 L8 52 Z" fill="#4d7c0f" />
			<path d="M20 48 L32 42 L32 52 L20 58 Z" fill="#3f6212" />
			<path d="M8 42 L20 36 L32 42 L20 48 Z" fill="#65a30d" />
		</g>
		<!-- skips -->
		<g stroke-width="1.4">
			<path d="M34 52 L42 56 L42 62 L34 58 Z" fill="#15803d" />
			<path d="M42 56 L50 52 L50 58 L42 62 Z" fill="#166534" />
			<path d="M34 52 L42 48 L50 52 L42 56 Z" fill="#22c55e" />
			<path d="M46 46 L52 49 L52 54 L46 51 Z" fill="#15803d" />
			<path d="M52 49 L57 46.5 L57 51.5 L52 54 Z" fill="#166534" />
			<path d="M46 46 L51 43.5 L57 46.5 L52 49 Z" fill="#22c55e" />
		</g>
	{:else if id === 'business_hub'}
		<g stroke-width="2">
			<path d="M8 20 L32 32 L32 68 L8 56 Z" fill="#2dd4bf" />
			<path d="M32 32 L56 20 L56 56 L32 68 Z" fill="#0d9488" />
			<path d="M8 20 L32 8 L56 20 L32 32 Z" fill="#99f6e4" />
		</g>
		<g stroke-width="0.9" stroke="#0f766e">
			<path d="M8 29 L32 41 M8 38 L32 50 M8 47 L32 59" />
			<path d="M32 41 L56 29 M32 50 L56 38 M32 59 L56 47" />
			<path d="M16 24 V60 M24 28 V64" />
			<path d="M40 60 V24 M48 56 V20" />
		</g>
		<g stroke-width="1.3">
			<path d="M26 12 L34 16 L34 20 L26 16 Z" fill="#e2e8f0" />
			<path d="M34 16 L42 12 L42 16 L34 20 Z" fill="#cbd5e1" />
			<path d="M26 12 L34 8 L42 12 L34 16 Z" fill="#f1f5f9" />
		</g>
	{/if}
</svg>
