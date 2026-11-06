// @ts-nocheck
import { describe, expect, it } from 'vitest';

const cells = [{ id: 'fct' }, { id: 'nassarawa' }];
const record = (indicator, label, value) => ({
	SurveyId: 'NG2018DHS',
	SurveyYear: 2018,
	DHS_CountryCode: 'NG',
	IndicatorId: indicator,
	CharacteristicCategory: label === 'Total' ? 'Total' : 'Region',
	CharacteristicLabel: label,
	Value: value,
	DenominatorWeighted: '',
	DenominatorUnweighted: '',
	CILow: '',
	CIHigh: ''
});
const response = () => ({
	TotalPages: 1,
	Data: ['HC_ELEC_P_ELC', 'ED_NARP_B_BTH'].flatMap((id) => [
		record(id, 'Total', 50),
		record(id, '..FCT Abuja', 75),
		record(id, '..Nasarawa', 0),
		record(id, 'North Central', 60)
	])
});
const build = async (responses) =>
	(await import('./build-development.mjs')).buildDevelopment(responses, cells);

describe('DHS development transformation', () => {
	it('joins state aliases, preserves zero and keeps national totals separate from regions', async () => {
		const out = await build([response()]);
		expect(Object.keys(out.snapshots[0].cells).sort()).toEqual(['fct', 'nassarawa']);
		expect(out.snapshots[0].cells.fct.electricityAccess.value).toBe(0.75);
		expect(out.snapshots[0].cells.nassarawa.primaryAttendance.value).toBe(0);
		expect(out.snapshots[0].national.electricityAccess.value).toBe(0.5);
		expect(out.snapshots[0].cells.fct.electricityAccess.denominatorWeighted).toBeNull();
	});

	it('rejects incomplete state coverage instead of silently inventing values', async () => {
		const r = response();
		r.Data = r.Data.filter((x) => x.CharacteristicLabel !== '..Nasarawa');
		await expect(build([r])).rejects.toThrow(/missing.*nassarawa/i);
	});

	it('rejects duplicate records and unfinished API pagination', async () => {
		const r = response();
		r.Data.push(r.Data[1]);
		await expect(build([r])).rejects.toThrow(/duplicate/i);
		await expect(build([{ ...response(), TotalPages: 2 }])).rejects.toThrow(/page/i);
	});

	it.each(['', null, -1, 101])('rejects missing or invalid percentages: %s', async (value) => {
		const r = response();
		r.Data[1].Value = value;
		await expect(build([r])).rejects.toThrow(/value|percentage/i);
	});
});
