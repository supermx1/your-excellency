// @ts-nocheck
import { describe, expect, it } from 'vitest';
import { packOutput, unpackOutput } from './recording.js';
import { runSimulation } from './world.js';
import { defaultSwitches } from './switches.js';

const run = runSimulation({ seed: 4, switches: defaultSwitches(), startYear: 1850, endYear: 2025 });

describe('recordings', () => {
	it('pack then unpack round-trips a run', async () => {
		expect(await unpackOutput(await packOutput(run))).toEqual(JSON.parse(JSON.stringify(run)));
	});

	it('a packed 1850–2025 run is under 600 KB', async () => {
		expect((await packOutput(run)).length).toBeLessThan(600_000);
	});
});
