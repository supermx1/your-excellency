import { readFileSync, writeFileSync } from 'node:fs';

const mapPaths = readFileSync('map-fragment.html', 'utf8');
const MUSIC = 'assets/music/happy-beats-business-moves-vol-1-by-ende-dot-app.mp3';

const statRows = [
	['War chest', '₦8.0bn', ''],
	['Popularity', '36', ''],
	['Connections', '30', ''],
	['Integrity', '70', ''],
	['EFCC risk', '20', 'rose']
]
	.map(
		([k, v, cls], i) =>
			`<div class="statrow ${cls}" data-r="${i}"><span>${k}</span><b>${v}</b></div>`
	)
	.join('\n');

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@600;800;900&display=block" rel="stylesheet" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1920px; height: 1080px; overflow: hidden; background: #fef3c7; }
      body { font-family: "Inter", system-ui, -apple-system, "Segoe UI", sans-serif; }
      .scene {
        position: absolute; inset: 0; width: 1920px; height: 1080px;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        overflow: hidden; padding: 60px;
      }
      .amber { background: #fef3c7; }
      .dark  { background: #0a0a0a; }
      .mega {
        color: #000; font-weight: 900; text-transform: uppercase;
        text-align: center; line-height: 0.92; letter-spacing: -0.03em;
        font-size: 132px; max-width: 1600px;
      }
      .chip {
        margin-top: 46px; background: #fde047; border: 5px solid #000;
        box-shadow: 10px 10px 0 #000; padding: 18px 34px;
        font-size: 38px; font-weight: 800; transform: rotate(-1.5deg);
      }
      .wordmark {
        position: absolute; top: 64px; left: 84px;
        display: inline-flex; align-items: center; gap: 16px;
        background: #34d399; border: 5px solid #000; box-shadow: 8px 8px 0 #000;
        padding: 12px 26px; font-size: 44px; font-weight: 900; text-transform: uppercase;
        transform: rotate(-1.5deg); color: #000;
      }
      .wordmark-logo { height: 60px; width: auto; display: block; }
      .cta-logo-badge { display: inline-flex; align-items: center; justify-content: center; background: #fef3c7; border: 4px solid #fff; border-radius: 20px; padding: 8px; }
      .cta-logo { height: 76px; width: auto; display: block; }
      #map { height: 640px; width: auto; display: block; }
      .tag { font-size: 44px; font-weight: 800; color: #000; text-align: center; }
      .row3 { display: flex; gap: 40px; align-items: stretch; }
      .row4 { display: flex; gap: 44px; align-items: stretch; }
      .card { background: #fff; border: 5px solid #000; box-shadow: 12px 12px 0 #000; padding: 34px 40px; }
      .cap { font-size: 24px; font-weight: 800; text-transform: uppercase; color: #57534e; letter-spacing: 0.04em; }
      .pick { margin-top: 14px; font-size: 52px; font-weight: 900; text-transform: uppercase; color: #000; }
      .select-card { display: flex; flex-direction: column; justify-content: center; min-width: 520px; }
      .stat-card { min-width: 560px; }
      .statrow {
        display: flex; justify-content: space-between; gap: 40px; align-items: baseline;
        border-bottom: 3px solid #000; padding: 16px 0; font-size: 40px; font-weight: 700; color: #000;
      }
      .statrow b { font-weight: 900; }
      .statrow.rose b { color: #e11d48; }
      .action { width: 620px; }
      .green { background: #bef264; }
      .red   { background: #fb7185; }
      .atitle { font-size: 52px; font-weight: 900; text-transform: uppercase; color: #000; line-height: 1; }
      .adesc  { margin-top: 18px; font-size: 34px; font-weight: 600; color: #000; }
      .atag   { margin-top: 26px; display: inline-block; border: 4px solid #000; padding: 6px 18px; font-size: 26px; font-weight: 900; text-transform: uppercase; }
      .atag.good { background: #fff; }
      .atag.bad  { background: #000; color: #fff; }
      .pre  { color: #fef3c7; font-size: 40px; font-weight: 800; text-transform: uppercase; }
      .hook {
        color: #fff; font-weight: 900; text-transform: uppercase; text-align: center;
        line-height: 0.98; letter-spacing: -0.02em; font-size: 116px; margin-top: 6px;
      }
      .hook .em  { color: #34d399; }
      .hook .yel { color: #fde047; }
      .cta { margin-top: 52px; display: flex; align-items: center; gap: 26px; }
      .mark2 { background: #34d399; border: 5px solid #fff; box-shadow: 8px 8px 0 #34d399; padding: 12px 24px; font-size: 40px; font-weight: 900; text-transform: uppercase; color: #000; }
      .url { color: #fff; font-size: 34px; font-weight: 700; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="20" data-width="1920" data-height="1080">

      <!-- Scene 1 — Hook -->
      <div id="scene-1" class="scene amber clip" data-start="0" data-duration="3.5" data-track-index="1">
        <h1 id="s1-head" class="mega">Everybody says they'd fix Nigeria.</h1>
        <div id="s1-chip" class="chip">So we built the game where you actually try.</div>
      </div>

      <!-- Scene 2 — The map -->
      <div id="scene-2" class="scene amber clip" data-start="3.5" data-duration="4" data-track-index="1">
        <div id="s2-mark" class="wordmark"><img class="wordmark-logo" src="assets/logo.png" alt="" /> Your Excellency</div>
        <svg id="map" viewBox="0 0 744 600" xmlns="http://www.w3.org/2000/svg">
${mapPaths}
        </svg>
        <div id="s2-tag" class="tag" style="margin-top: 28px">Run for President. All 36 states + FCT.</div>
      </div>

      <!-- Scene 3 — Build your candidate -->
      <div id="scene-3" class="scene amber clip" data-start="7.5" data-duration="4" data-track-index="1">
        <div id="s3-title" class="tag" style="margin-bottom: 40px">Pick your background. Then live with it.</div>
        <div class="row3">
          <div id="s3-select" class="card select-card">
            <div class="cap">Background</div>
            <div id="s3-pick" class="pick">Billionaire outsider</div>
          </div>
          <div id="s3-stats" class="card stat-card">
            <div class="cap" style="margin-bottom: 6px">You'll start with</div>
${statRows}
          </div>
        </div>
      </div>

      <!-- Scene 4 — Clean vs dirty -->
      <div id="scene-4" class="scene amber clip" data-start="11.5" data-duration="4.5" data-track-index="1">
        <div class="row4">
          <div id="s4-green" class="card action green">
            <div class="atitle">Ward-by-ward ground game</div>
            <div class="adesc">Builds real support.</div>
            <div class="atag good">Clean</div>
          </div>
          <div id="s4-red" class="card action red">
            <div class="atitle">Godfather deal</div>
            <div class="adesc">Fast money, no receipts. EFCC go dey watch you.</div>
            <div class="atag bad">Dirty</div>
          </div>
        </div>
        <div id="s4-title" class="tag" style="margin-top: 52px">Every shortcut has a price.</div>
      </div>

      <!-- Scene 5 — Outro / the hook -->
      <div id="scene-5" class="scene dark clip" data-start="16" data-duration="4" data-track-index="1">
        <div id="s5-pre" class="pre">Money counts for nothing.</div>
        <h1 id="s5-hook" class="hook">Get rich.<br /><span class="em">Or get remembered.</span><br /><span class="yel">You can't do both.</span></h1>
        <div id="s5-cta" class="cta">
          <span class="cta-logo-badge"><img class="cta-logo" src="assets/logo.png" alt="" /></span>
          <span class="mark2">Your Excellency</span>
          <span class="url">yourexcellency.com.ng</span>
        </div>
      </div>

      <!-- Audio -->
      <audio id="music" class="clip" data-start="0" data-duration="20" data-track-index="20" data-volume="0.5" src="${MUSIC}"></audio>
      <audio id="sfx-hook-open" class="clip" data-start="0.15" data-duration="0.9" data-track-index="21" data-volume="0.9" src="assets/sfx/impactPlate_heavy_001.ogg"></audio>
      <audio id="sfx-tick-1" class="clip" data-start="8.02" data-duration="0.5" data-track-index="22" data-volume="0.42" src="assets/sfx/click_002.ogg"></audio>
      <audio id="sfx-tick-2" class="clip" data-start="8.52" data-duration="0.5" data-track-index="22" data-volume="0.42" src="assets/sfx/click_002.ogg"></audio>
      <audio id="sfx-tick-3" class="clip" data-start="9.02" data-duration="0.5" data-track-index="22" data-volume="0.42" src="assets/sfx/click_002.ogg"></audio>
      <audio id="sfx-tick-4" class="clip" data-start="9.52" data-duration="0.5" data-track-index="22" data-volume="0.42" src="assets/sfx/click_002.ogg"></audio>
      <audio id="sfx-tick-5" class="clip" data-start="10.02" data-duration="0.5" data-track-index="22" data-volume="0.42" src="assets/sfx/click_002.ogg"></audio>
      <audio id="sfx-green" class="clip" data-start="11.55" data-duration="0.8" data-track-index="23" data-volume="0.5" src="assets/sfx/bong_001.ogg"></audio>
      <audio id="sfx-red" class="clip" data-start="13.51" data-duration="0.9" data-track-index="23" data-volume="0.85" src="assets/sfx/impactPunch_heavy_001.ogg"></audio>
      <audio id="sfx-hook-close" class="clip" data-start="17.02" data-duration="1.2" data-track-index="24" data-volume="0.95" src="assets/sfx/impactPlate_heavy_003.ogg"></audio>
    </div>

    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });

      // Scene 1 — hook slam, then chip
      tl.fromTo("#s1-head", { opacity: 0, scale: 1.18 }, { opacity: 1, scale: 1, duration: 0.35, ease: "power3.out" }, 0.15);
      tl.fromTo("#s1-chip", { opacity: 0, y: 34 }, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" }, 1.9);
      tl.to("#s1-head", { opacity: 0, duration: 0.25 }, 3.25);
      tl.to("#s1-chip", { opacity: 0, duration: 0.25 }, 3.25);
      tl.set("#s1-head", { opacity: 0 }, 3.5);
      tl.set("#s1-chip", { opacity: 0 }, 3.5);

      // Scene 2 — wordmark, map assembles (stagger fade), tagline
      tl.fromTo("#s2-mark", { opacity: 0, x: -50 }, { opacity: 1, x: 0, duration: 0.4, ease: "back.out(1.6)" }, 3.55);
      tl.fromTo("#map", { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.6, ease: "power2.out" }, 3.65);
      tl.fromTo("#map .st", { opacity: 0 }, { opacity: 1, duration: 0.5, stagger: 0.02, ease: "power1.out" }, 3.7); // beat-grid: map fills through ~4.5s
      tl.fromTo("#s2-tag", { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" }, 5.0);
      tl.to(["#map", "#s2-tag", "#s2-mark"], { opacity: 0, duration: 0.25 }, 7.25);
      tl.set(["#map", "#s2-tag", "#s2-mark"], { opacity: 0 }, 7.5);

      // Scene 3 — setup card, billionaire pick, stat rows tick in on the beat grid
      tl.fromTo("#s3-title", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" }, 7.6);
      tl.fromTo("#s3-select", { opacity: 0, x: -40, scale: 0.96 }, { opacity: 1, x: 0, scale: 1, duration: 0.4, ease: "back.out(1.4)" }, 7.7);
      tl.fromTo("#s3-pick", { opacity: 0, scale: 1.12 }, { opacity: 1, scale: 1, duration: 0.3, ease: "power3.out" }, 8.0);
      tl.fromTo("#s3-stats", { opacity: 0, x: 40 }, { opacity: 1, x: 0, duration: 0.4, ease: "power2.out" }, 7.8);
      // beat-grid: stat rows at 8.02, 8.52, 9.02, 9.52, 10.02 — reveal fast, hold the full set to 11.5
      tl.fromTo("#s3-stats .statrow", { opacity: 0, x: 24 }, { opacity: 1, x: 0, duration: 0.28, stagger: 0.5, ease: "power2.out" }, 8.02);
      tl.to("#s3-title, #s3-select, #s3-stats", { opacity: 0, duration: 0.22 }, 11.28);
      tl.set("#s3-title, #s3-select, #s3-stats", { opacity: 0 }, 11.5);

      // Scene 4 — green slides in, red SLAMS in, caption punches
      tl.fromTo("#s4-green", { opacity: 0, x: -70 }, { opacity: 1, x: 0, duration: 0.45, ease: "power3.out" }, 11.6);
      tl.fromTo("#s4-red", { opacity: 0, scale: 1.28, rotation: 2 }, { opacity: 1, scale: 1, rotation: 0, duration: 0.35, ease: "power4.out" }, 13.51); // beat-grid: red slam on 13.51
      tl.fromTo("#s4-title", { opacity: 0, scale: 1.15 }, { opacity: 1, scale: 1, duration: 0.3, ease: "power3.out" }, 14.45);
      tl.to("#s4-green, #s4-red, #s4-title", { opacity: 0, duration: 0.22 }, 15.78);
      tl.set("#s4-green, #s4-red, #s4-title", { opacity: 0 }, 16.0);

      // Scene 5 — "money counts for nothing", then the hook slam (beat-locked), then CTA
      tl.fromTo("#s5-pre", { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" }, 16.05);
      tl.to("#s5-pre", { opacity: 0, duration: 0.25 }, 16.95);
      tl.fromTo("#s5-hook", { opacity: 0, scale: 1.16 }, { opacity: 1, scale: 1, duration: 0.4, ease: "power4.out" }, 17.02); // beat-locked: 17.02s strong cue
      tl.fromTo("#s5-hook .yel", { scale: 1 }, { scale: 1.08, duration: 0.2, yoyo: true, repeat: 1, ease: "power1.inOut" }, 17.7);
      tl.fromTo("#s5-cta", { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.4, ease: "back.out(1.4)" }, 18.7);

      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
`;

writeFileSync('index.html', html);
console.log('wrote index.html', html.length, 'chars');
