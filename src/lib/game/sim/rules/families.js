// @ts-nocheck
// Four fictional families followed across generations. Each member's life is drawn from
// the conditions of the cell they live in; names come from the cell's language.
import { FAITHS } from './religion.js';

export const FAMILY_CELLS = ['kano', 'oyo', 'anambra', 'cross-river'];

const pick = (rand, xs) => xs[Math.floor(rand() * xs.length)];

function nameList(world, cellId) {
	const names = world.data.names;
	return names?.languages[names.cellLanguage[cellId]];
}

function drawFaith(world, cell, parentFaith) {
	if (parentFaith && world.familyRand() < 0.9) return parentFaith;
	let r = world.familyRand();
	for (const f of FAITHS) if ((r -= cell.religion[f]) <= 0) return f;
	return 'traditional';
}

function newMember(world, family, cellId, born, parentFaith) {
	const cell = world.cellById.get(cellId);
	const connectionThreshold = world.familyRand();
	return {
		name: pick(world.familyRand, nameList(world, cellId).given),
		born,
		cell: cellId,
		occupation: 'child',
		canRead: false,
		hasElectricity: cell.electricityAccess > connectionThreshold,
		connectionThreshold,
		faith: drawFaith(world, cell, parentFaith),
		nextChildAt: born + 20 + Math.floor(world.familyRand() * 11),
		lifeEvents: [{ year: born, kind: 'born', text: `born in ${cell.name ?? cellId}` }]
	};
}

/** Creates the families at the start of a run (needs names data). */
export function createFamilies(world) {
	if (!world.data.names) return [];
	return FAMILY_CELLS.filter((id) => world.cellById.has(id)).map((cellId, i) => {
		const family = {
			id: `f${i + 1}`,
			surname: pick(world.familyRand, nameList(world, cellId).surnames),
			homeCell: cellId,
			members: []
		};
		const first = newMember(
			world,
			family,
			cellId,
			world.year - 20 - Math.floor(world.familyRand() * 6)
		);
		first.nextChildAt = Math.max(world.year + 1, first.nextChildAt);
		first.occupation = 'farmer';
		family.members.push(first);
		return family;
	});
}

function occupation(world, cell, m) {
	const tech = world.polities.find((p) => p.id === cell.polityId)?.tech ?? [];
	const skilled = ['teacher', 'clerk', 'trader'];
	if (tech.includes('railway') || tech.includes('electricity')) skilled.push('engineer');
	if (tech.includes('germ-theory')) skilled.push('nurse');
	const urbanJobs = ['trader', 'artisan'];
	if (tech.includes('motor-car')) urbanJobs.push('driver');
	if (tech.includes('steam-engine') || (tech.includes('electricity') && cell.powerService > 0.25))
		urbanJobs.push('factory worker');
	if (m.canRead && world.familyRand() < cell.urban + cell.litSchool * 0.5)
		return pick(world.familyRand, skilled);
	if (world.familyRand() < cell.urban) return pick(world.familyRand, urbanJobs);
	return pick(world.familyRand, ['farmer', 'farmer', 'herder', 'fisher']);
}

/** @param {import('../types.js').World} world */
export function stepFamilies(world) {
	const y = world.year;
	for (const family of world.families) {
		const last = family.members.at(-1);
		for (const m of family.members) {
			if (m.died) continue;
			const cell = world.cellById.get(m.cell);
			const age = y - m.born;
			if (!m.foodHardship && cell.foodStress > 0.2) {
				m.foodHardship = true;
				m.lifeEvents.push({
					year: y,
					kind: 'hardship',
					text:
						cell.warDamage > 0.3
							? 'faces food shortages as conflict disrupts supplies'
							: 'faces food shortages after a poor harvest'
				});
			} else if (m.foodHardship && cell.foodStress < 0.1) {
				m.foodHardship = false;
				m.lifeEvents.push({ year: y, kind: 'recovery', text: 'sees food supplies recover' });
			}

			if (!m.hasElectricity && cell.electricityAccess > m.connectionThreshold) {
				m.hasElectricity = true;
				m.lifeEvents.push({ year: y, kind: 'electricity', text: 'gets electricity at home' });
			}

			if (age === 15) {
				m.litAtYouth = cell.litAny;
				m.canRead = world.familyRand() < cell.litAny;
				if (m.canRead) m.lifeEvents.push({ year: y, kind: 'reads', text: 'learns to read' });
			}
			if (age === 18) {
				const richer = cell.neighbours
					.map((id) => world.cellById.get(id))
					.filter((n) => n && n.incomePc > cell.incomePc * 1.5)
					.sort((a, b) => b.incomePc - a.incomePc)[0];
				if (richer && world.familyRand() < 0.4) {
					m.cell = richer.id;
					m.lifeEvents.push({
						year: y,
						kind: 'migrates',
						text: `moves to ${richer.name ?? richer.id}`
					});
				}
				m.occupation = occupation(world, world.cellById.get(m.cell), m);
				m.lifeEvents.push({ year: y, kind: 'work', text: `works as a ${m.occupation}` });
			}
			if (m === last && y >= m.nextChildAt) {
				family.members.push(newMember(world, family, m.cell, y, m.faith));
				m.lifeEvents.push({ year: y, kind: 'child', text: 'has a child' });
			}

			// Deaths only once the next generation exists, so every line continues.
			if (m === family.members.at(-1)) continue;
			if (cell.warDamage > 0.5 && world.familyRand() < 0.05)
				die(m, y, 'war-death', 'killed in the war');
			else if (world.familyRand() < Math.max(0, (age - cell.lifeExp) / 400) + cell.deathRate * 0.3)
				die(m, y, 'death', 'dies');
		}
	}
}

function die(m, year, kind, text) {
	m.died = year;
	m.lifeEvents.push({ year, kind, text });
}
