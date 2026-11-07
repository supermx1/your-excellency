<script>
	// @ts-nocheck
	let {
		playing,
		speed,
		year,
		startYear,
		endYear,
		keyYears = [],
		follow,
		onToggle,
		onSpeed,
		onSeek,
		onFollow,
		onSplit,
		popLabels = false,
		onPopLabels
	} = $props();

	const SPEEDS = [0.5, 1, 2, 4];
	const base = 'border-2 border-black px-2 py-1 text-xs font-black uppercase shadow-[2px_2px_0_0_#000]';
	const btn = `${base} bg-white`;
	const toggle = (on) => `${base} ${on ? 'bg-black text-white' : 'bg-white'}`;
</script>

<div class="absolute right-0 bottom-0 left-0 flex flex-wrap items-center gap-2 border-t-4 border-black bg-amber-100 px-3 py-2">
	<button type="button" class="{btn} min-w-16" onclick={onToggle} aria-label={playing ? 'Pause' : 'Play'}>
		{playing ? 'Pause' : 'Play'}
	</button>
	<div class="flex" role="group" aria-label="Speed">
		{#each SPEEDS as s (s)}
			<button type="button" class={toggle(speed === s)} aria-pressed={speed === s} onclick={() => onSpeed(s)}>×{s}</button>
		{/each}
	</div>
	<label class="flex min-w-48 flex-1 items-center gap-2 text-xs font-black uppercase">
		<span class="sr-only">Scrub</span>
		<input
			type="range"
			class="w-full accent-black"
			min={startYear}
			max={endYear}
			step="1"
			value={Math.floor(year)}
			list="key-years"
			oninput={(e) => onSeek(Number(e.currentTarget.value))}
		/>
	</label>
	<datalist id="key-years">
		{#each keyYears as y (y)}<option value={y}></option>{/each}
	</datalist>
	<label class="flex items-center gap-1 text-xs font-black uppercase">
		Jump to year
		<input
			type="number"
			class="w-20 border-2 border-black px-1 py-0.5"
			min={startYear}
			max={endYear}
			onchange={(e) => onSeek(Number(e.currentTarget.value))}
			oninput={(e) => {
				const v = Number(e.currentTarget.value);
				if (v >= startYear && v <= endYear && String(v).length === 4) onSeek(v);
			}}
		/>
	</label>
	<button type="button" class={toggle(follow)} aria-pressed={follow} onclick={onFollow}>Follow events</button>
	<button type="button" class={toggle(popLabels)} aria-pressed={popLabels} onclick={onPopLabels}>Population</button>
	<button type="button" class={btn} onclick={onSplit}>Two Nigerias</button>
</div>
