// @ts-nocheck
// The HyperFrames root document for an exported run: two map canvases, the overlay, one voice clip per chapter.
// data-no-timeline: there is no GSAP timeline; page.js draws every frame from the hf-seek time.

/** @param {{ width: number, height: number, duration: number, cues: { chapter?: number | string, id?: string, file?: string, start: number, seconds: number }[] }} o */
export function compositionHtml({ width, height, duration, cues }) {
	const audio = cues
		.map(
			(c, i) =>
				`\t\t<audio id="narr-${c.id ?? c.chapter}" class="clip" src="${c.file ?? `audio/chapter-${c.chapter}.wav`}" data-start="${c.start.toFixed(3)}" data-duration="${c.seconds.toFixed(3)}" data-track-index="${10 + i}" data-volume="1"></audio>`
		)
		.join('\n');
	return `<!doctype html>
<html lang="en">
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=${width}, height=${height}" />
	<title>The Timeline</title>
	<link rel="stylesheet" href="page.css" />
</head>
<body>
	<div id="root" data-composition-id="timeline-export" data-no-timeline data-start="0" data-width="${width}" data-height="${height}" data-duration="${duration.toFixed(3)}" style="width:${width}px;height:${height}px">
		<canvas id="hf-real" data-layout-allow-overflow></canvas>
		<canvas id="hf-map" data-layout-allow-overflow></canvas>
		<div id="hf-hud" style="position:absolute;inset:0"></div>
${audio}
	</div>
	<script type="module" src="page.js"></script>
</body>
</html>
`;
}
