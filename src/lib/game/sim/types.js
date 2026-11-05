// JSDoc typedefs only — the shared contract between world.js and rules/*.js.

/**
 * @typedef {{ islam: number, christian: number, traditional: number }} ReligionShares
 * @typedef {{ mortality: number, productivity: number, learning: number }} CellMods
 * @typedef {object} Cell
 * @property {string} id
 * @property {string[]} neighbours
 * @property {number} area
 * @property {boolean} coastal
 * @property {string} polityId
 * @property {number} pop
 * @property {number} urban        share 0–1
 * @property {number} litAny       reads any script, share 0–1
 * @property {number} litSchool    official (western) school literacy, share 0–1
 * @property {number} lifeExp      years
 * @property {number} incomePc     constant international $ per head
 * @property {number} infra        0–1
 * @property {number} warDamage    0–1, decays
 * @property {number} tension      0–1
 * @property {ReligionShares} religion
 * @property {{ quranic: number, mission: number, state: number }} schools  0–1 coverage
 * @property {CellMods} mods
 *
 * @typedef {object} Polity
 * @property {string} id
 * @property {string} name
 * @property {string} capitalCell
 * @property {string[]} cellIds
 * @property {string} government
 * @property {'islam'|'christian'|'traditional'|null} stateReligion
 * @property {number} treasury
 * @property {number} army
 * @property {number} stability   0–1
 * @property {number} knowledge   0+
 * @property {string[]} tech
 * @property {string[]} atWarWith
 *
 * @typedef {{ year: number, kind: string, title: string, polityIds?: string[], cellIds?: string[], deaths?: number, techId?: string, aheadOfReal?: number }} SimEvent
 * @typedef {{ name: string, born: number, died?: number, cell: string, occupation: string, canRead: boolean, faith: string, lifeEvents: {year:number, kind:string, text:string}[] }} FamilyMember
 * @typedef {{ id: string, surname: string, homeCell: string, members: FamilyMember[] }} Family
 *
 * @typedef {{ seed: number, switches: Record<string, any>, startYear: number, endYear: number }} RunInputs
 * @typedef {object} YearSnapshot
 * @property {number} year
 * @property {object[]} cells
 * @property {{ id: string, name: string, cellIds: string[] }[]} polities
 * @property {{ pop: number, litAny: number, litSchool: number, lifeExp: number, urban: number, wars: number }} totals
 *
 * @typedef {object} World
 * @property {number} year
 * @property {() => number} rand
 * @property {Cell[]} cells
 * @property {Map<string, Cell>} cellById
 * @property {Polity[]} polities
 * @property {Family[]} families
 * @property {SimEvent[]} events
 * @property {YearSnapshot[]} history
 * @property {Record<string, any>} switches
 * @property {Record<string, boolean>} flags
 * @property {RunInputs} inputs
 * @property {any} data
 *
 * @typedef {{ engineVersion: number, inputs: RunInputs, history: YearSnapshot[], events: SimEvent[], families: Family[] }} RunResult
 */

export {};
