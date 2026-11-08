// @ts-nocheck
// Four fictional families followed across generations. Each member's life is drawn from
// the conditions of the cell they live in; names come from the cell's language.
import { FAITHS } from './religion.js';

export const FAMILY_CELLS = ['kano', 'oyo', 'anambra', 'cross-river'];

const pick = (rand, xs) => xs[Math.floor(rand() * xs.length)];

// Household money, kept simple on purpose: what matters is which choices a family can afford.
// Pay is relative to the state's income per person; land work loses income in a food crisis.
const PAY = { farmer: 0.7, herder: 0.7, fisher: 0.8, artisan: 1, trader: 1.2, driver: 1.2, 'factory worker': 1.3, clerk: 1.5, teacher: 1.5, nurse: 1.6, engineer: 2.5, 'shop owner': 1.8 };
const LAND = new Set(['farmer', 'herder', 'fisher']);
const SPEND = 0.95; // share of a normal year's income spent on the household itself
const OBLIGATIONS = 0.15; // share of savings that goes each year to extended family, weddings and funerals
// Together these settle savings near four months of income, so one bad harvest can empty them.
const SCHOOL_FEES = 0.25; // of a year's income, for a child's years of school
const MOVE_COST = 0.3;
const SHOP_COST = 0.25;

/** One year of household income and spending; returns this year's income (0 if nobody earns). */
function budget(world, family, y) {
	let income = 0;
	let normal = 0;
	for (const m of family.members) {
		const age = y - m.born;
		if (m.died || age < 18 || age >= 65 || !PAY[m.occupation]) continue;
		const c = world.cellById.get(m.cell);
		const pay = c.incomePc * PAY[m.occupation];
		normal += pay;
		income += LAND.has(m.occupation) ? pay * (1 - 0.6 * c.foodStress) : pay;
	}
	if (!normal) return 0;
	const home = world.cellById.get(family.members.findLast((m) => !m.died)?.cell ?? family.homeCell);
	const before = family.savings;
	family.savings = Math.max(0, family.savings * (1 - OBLIGATIONS) + income - normal * SPEND * (1 + 0.5 * home.foodStress)); // food costs more in a shortage
	if (!family.broke && before > 0 && family.savings === 0) {
		family.broke = true;
		const head = family.members.find((m) => !m.died && y - m.born >= 18);
		head?.lifeEvents.push({ year: y, kind: 'savings-gone', text: home.foodStress > 0.2 ? 'spends the last of the savings on food' : 'runs out of savings' });
	} else if (family.broke && family.savings > 0.25 * income) family.broke = false;
	return income;
}

/** Savings in months of household income, for the family card. */
const months = (family, income) => (income ? Math.round((12 * family.savings) / income) : 0);

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
			members: [],
			savings: 0,
			broke: false,
			months: [] // savings in months of income, one entry per year from the start year
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
		const income = budget(world, family, y);
		family.months.push(months(family, income));
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

			if (age === 6) {
				const s = cell.schools;
				const nearby = Math.min(1, s.quranic + s.mission + s.state + cell.schoolExpansion);
				const free = world.switches.freeSchoolingFromYear != null && y >= world.switches.freeSchoolingFromYear;
				const fees = free ? 0 : SCHOOL_FEES * income;
				if (world.familyRand() < nearby) {
					if (family.savings >= fees) {
						family.savings -= fees;
						m.schooled = true;
						m.lifeEvents.push({ year: y, kind: 'school', text: free ? 'starts at a free school' : 'starts school' });
					} else
						m.lifeEvents.push({
							year: y,
							kind: 'no-school',
							text: cell.foodStress > 0.2 ? 'misses school: the savings went on food' : 'misses school: the family cannot afford the fees'
						});
				}
			}
			if (age === 15) {
				m.litAtYouth = cell.litSchool;
				// School makes reading likely; without it, some still learn at home or at work.
				m.canRead = world.familyRand() < (m.schooled ? Math.max(0.85, cell.litSchool) : cell.litSchool * 0.5);
				if (m.canRead) m.lifeEvents.push({ year: y, kind: 'reads', text: 'learns to read' });
			}
			if (age === 18) {
				const richer = cell.neighbours
					.map((id) => world.cellById.get(id))
					.filter((n) => n && n.incomePc > cell.incomePc * 1.5)
					.sort((a, b) => b.incomePc - a.incomePc)[0];
				if (richer && world.familyRand() < 0.4) {
					const cost = MOVE_COST * (income || cell.incomePc);
					if (family.savings >= cost) {
						family.savings -= cost;
						m.cell = richer.id;
						m.lifeEvents.push({ year: y, kind: 'migrates', text: `moves to ${richer.name ?? richer.id}` });
					} else
						m.lifeEvents.push({ year: y, kind: 'stays', text: `wants work in ${richer.name ?? richer.id} but cannot afford the move` });
				}
				m.occupation = occupation(world, world.cellById.get(m.cell), m);
				m.lifeEvents.push({ year: y, kind: 'work', text: `works as ${/^[aeiou]/.test(m.occupation) ? 'an' : 'a'} ${m.occupation}` });
			}
			if (
				age >= 25 &&
				age < 55 &&
				['farmer', 'trader', 'artisan', 'driver'].includes(m.occupation) &&
				cell.urban > 0.15 &&
				family.savings >= 0.3 * income &&
				world.familyRand() < 0.04
			) {
				family.savings -= SHOP_COST * income;
				m.lifeEvents.push({ year: y, kind: 'business', text: m.occupation === 'artisan' ? 'opens a workshop with the family savings' : 'opens a shop with the family savings' });
				m.occupation = 'shop owner';
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
