<script>
	import './layout.css';
	import favicon from '$lib/assets/favicon.png';

	let { children } = $props();

	const btn =
		'border-2 border-black font-black uppercase tracking-wide shadow-[4px_4px_0_0_#000] transition active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-40 disabled:shadow-none';
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}

<footer class="border-t-4 border-black bg-white">
	<div
		class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 text-sm font-bold md:px-8"
	>
		<p class="font-medium">
			Also from us: <a
				class="underline decoration-2 underline-offset-2 hover:bg-yellow-300"
				href="https://otr.techgfxlimited.com/">On The Record</a
			> — chat with AI avatars of Nigerian leaders, grounded in their real public record.
		</p>
		<div class="flex items-center gap-2">
			<a
				class="{btn} bg-yellow-300 px-3 py-1.5 text-sm"
				href="https://ko-fi.com/theaveragetechdad"
				rel="noopener">Buy me kunu</a
			>
			<a
				class="{btn} grid size-9 place-items-center bg-white"
				href="https://www.youtube.com/@TheAverageTechDad"
				rel="noopener"
				aria-label="YouTube — The Average Tech Dad"
			>
				<svg viewBox="0 0 24 24" class="size-5" fill="currentColor" aria-hidden="true">
					<path
						d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8ZM9.5 15.6V8.4l6.3 3.6-6.3 3.6Z"
					/>
				</svg>
			</a>
		</div>
	</div>
</footer>
