<script>
	let { count } = $props();
</script>

<p
	class="inline-flex -rotate-1 items-center gap-2 border-2 border-black bg-lime-300 px-3 py-1.5 text-sm font-black uppercase shadow-[3px_3px_0_0_#000]"
>
	{count.toLocaleString()} have taken the oath
</p>
