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
 * @property {number} electricityAccess  0–1, population share with a household connection
 * @property {number} powerService  0–1, modelled usable service, distinct from access
 * @property {number} schoolExpansion  0–0.4, additional capacity built by the free-school policy
 * @property {number|null} developmentYear  source survey year at initialization, null for model estimates
 * @property {number} foodBuffer  0–1, modelled resilience to harvest disruption
 * @property {number} foodStress  0–1 pressure index, not a hunger prevalence estimate
 * @property {number} harvestShock  0–1 loss from active drought productivity effects
 * @property {number} marketAccess  0–1 infrastructure and transport proxy
 * @property {number} netMigration  people, arrivals minus departures in the latest step
 * @property {Record<string,number>|null} incomeFactors  recorded multiplicative non-oil income factors
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
 * @typedef {{ year: number, kind: string, title: string, polityIds?: string[], cellIds?: string[], deaths?: number, techId?: string, aheadOfReal?: number, worldFirst?: boolean }} SimEvent
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
 * @property {() => number} familyRand  independent stream so stories cannot alter national outcomes
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
