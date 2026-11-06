<script>
	// @ts-nocheck
	let { card } = $props();
</script>

<article class="max-w-xs bg-[#f2efe6] px-3 py-2 text-sm text-[#1b1b1b] shadow-[0_8px_20px_rgba(0,0,0,0.5)]">
	<p class="text-[10px] font-black tracking-[0.15em] text-[#8a5a2b] uppercase">The {card.surname} family · {card.year}</p>
	<p class="mt-1 font-serif">{card.text}</p>
</article>
