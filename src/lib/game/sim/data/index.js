// Default data bundle for the engine. Rebuild with `pnpm sim:data`.
import cells from './cells.json';
import national from './national.json';
import regional from './regional.json';
import polities from './polities-1850.json';
import realBorders from './real-borders.json';
import events from './events.json';
import tech from './tech.json';
import names from './names.json';
import development from './development.json';
import minerals from './minerals.json';
import nbs from './nbs.json';

export const defaultData = {
	cells,
	national,
	regional,
	polities,
	realBorders,
	events,
	tech,
	names,
	development,
	minerals,
	nbs
};

// Globe and neighbour outlines (Plan 2b). Not part of defaultData: the engine never needs them.
export { default as world } from './world.json';
export { default as region } from './region.json';
export { default as westAfrica } from './westafrica.json';
