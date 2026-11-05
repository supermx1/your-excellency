// Default data bundle for the engine. Rebuild with `pnpm sim:data`.
import cells from './cells.json';
import national from './national.json';
import regional from './regional.json';
import polities from './polities-1850.json';
import realBorders from './real-borders.json';
import events from './events.json';
import tech from './tech.json';
import names from './names.json';

export const defaultData = { cells, national, regional, polities, realBorders, events, tech, names };
