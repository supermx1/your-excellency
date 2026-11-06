# The Timeline: data and model assumptions

Updated 6 November 2026. Engine version: 4. Includes the initial survey batch, the historical population / livelihoods upgrade, and the future tech ladder.

## Evidence added

The 2013 and 2018 Nigeria Demographic and Health Surveys supply **148 state observations**: two indicators for each of 36 states plus FCT in two surveys. Four national reference values are retained separately. These are public aggregate statistics, not household records.

| Field               | DHS indicator   | Meaning                                                                                                                                                              |
| ------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `electricityAccess` | `HC_ELEC_P_ELC` | Share of the de jure population living in households with electricity. Does not measure reliability, hours of supply, business connections or generation.            |
| `primaryAttendance` | `ED_NARP_B_BTH` | Net primary attendance: share of primary-school-age children attending primary school. Does not measure adult literacy, learning outcomes or all forms of education. |

Source: National Population Commission and ICF, Nigeria DHS 2013 and 2018, via the [DHS Indicator Data API](https://api.dhsprogram.com/). API requests are recorded in `scripts/sim-data/build-development.mjs` and the generated `development.json`. Retrieved 6 November 2026.

Required attribution: The DHS Program Indicator Data API, The Demographic and Health Surveys (DHS) Program. ICF. Originally funded by the United States Agency for International Development (USAID). Available from api.dhsprogram.com. Accessed 6 November 2026. See [API citation terms](https://api.dhsprogram.com/html/terms.cfm).

The data pipeline preserves any weighted/unweighted denominators and confidence limits returned by the API. Missing precision metadata stays `null`; it is not zero and is not a claim of certainty. Source percentages are converted to fractions without filling gaps or averaging zones into states. `Nasarawa` maps to the map package's `nassarawa` identifier; `FCT Abuja` maps to `fct`.

## Rebuilding and validating

Run `pnpm sim:data` to fetch raw inputs into the ignored `.cache` directory and rebuild the shipped data. Cached survey responses are pinned to survey IDs `NG2013DHS` and `NG2018DHS`; remove the corresponding cached file to explicitly refresh it. No source download occurs in a player's browser.

The development builder rejects incomplete API pagination, duplicate values, mixed surveys/countries, invalid or missing percentages, unknown states and missing state/indicator combinations. Zonal, wealth and residence breakdowns are deliberately excluded from the state table. All 37 state identifiers must match.

The new compact evidence file is imported with the engine data and listed on `/sim/sources`. The existing total compressed-data budget remains enforced by `data.test.js`.

## How evidence enters a run

Only the latest survey at or before the start year initializes the cells. Starts in 2013–2017 use 2013; starts in 2018–2025 use 2018 as an older starting estimate. Starts before 2013 use the existing model estimates. Modern survey values are never backfilled into 1850.

The annual rules never reread survey observations. A simulation crossing 2013 or 2018 continues along its own history without being pulled towards those measurements. Later-start surveys are not evidence about the outcomes of an earlier counterfactual run.

School attendance initializes a **proxy for formal learning capacity**, split between existing mission/state-school coverage in their previous proportions. That allocation is a model assumption, not a survey observation about providers. It does not overwrite adult literacy. Religion shares retain their existing initialization.

The HUD compares electricity access with an observed national reference only in a survey year. It shows no reference for other years rather than presenting a carried or interpolated value as an observation. Older recordings remain playable; new runs are version 3 and are saved separately.

## Historical regional population

The previous backcast of 2006 census shares has been replaced by a compact extract of the HYDE historical reconstruction distributed as ISIMIP2b `population_histsoc_0p5deg_annual_1861-2005.nc4`. Fifteen dated spatial patterns (1861 and decennial anchors through 2000) are aggregated into the 37 modern map footprints, with the 2006 census retained as the final anchor. These are estimates in modern reporting areas, not assertions about historical state boundaries.

The earliest grid is 1861. **1850 uses its spatial pattern as an explicitly labelled proxy**, scaled to the existing 1850 national population estimate. This avoids projecting 2006's spatial distribution back more than a century, but it does not provide direct settlement observations for 1850. Polity assignments and religious starting shares remain separately authored approximations.

Aggregation intersects each GRID3 / geoBoundaries state polygon with the half-degree grid and allocates each source cell's count in proportion to overlap area. It handles polygon holes and ocean/missing cells, rejects overlapping state footprints, and verifies all 37 identifiers. Within-cell population is assumed uniform. At this resolution, edge allocation and small areas are approximate; these data cannot establish individual city populations.

Only the resulting regional **shares** are used. National totals still follow the existing OWID/UN series. Starting years interpolate the shares of the bracketing regional anchors; largest-remainder apportionment makes integer regional populations sum exactly to the national total. The real-history comparison map now uses the same dated anchors instead of fixed 2006 shares.

The reference extract and provenance live in `scripts/sim-data/reference/historical-population.json`; `pnpm sim:data` reads this checked-in file and does not require scientific Python libraries or the global raster. Its sources record the pinned download URLs and checksums. HYDE/ISIMIP and the GRID3 / geoBoundaries footprints are attributed under CC BY 4.0.

To independently rebuild the optional extract:

```sh
python3 -m venv scripts/sim-data/.cache/historical-venv
scripts/sim-data/.cache/historical-venv/bin/pip install -r scripts/sim-data/requirements-history.txt
scripts/sim-data/.cache/historical-venv/bin/python -m unittest discover -s scripts/sim-data -p test_extract_history.py
scripts/sim-data/.cache/historical-venv/bin/python scripts/sim-data/extract_history.py
pnpm sim:data
```

This optional step downloads a roughly 33 MB global count raster and the pinned Nigeria boundary file into the ignored cache. It verifies the raster's SHA-512 before extraction. Neither file is shipped to players.

## Gameplay relationships introduced

These relationships are explicit design assumptions. They have not been estimated causally from DHS:

- Ordinary connections require electricity technology. Infrastructure, income and stability determine how quickly the remaining affordable connection gap closes. Without an observation, a later historical start with electricity uses infrastructure as its initial access proxy.
- Connected access and usable service are separate variables. Ordinary service assumes 50% of ideal availability, reduced by war damage. The explicit 24-hour-power scenario supplies universal access and ideal service, subject to war disruption. Full service adds at most 15% to non-oil potential income through the new term; the existing infrastructure effects also remain.
- River trade (engine 5): the eleven states the Niger or Benue runs through (from the Natural Earth river lines) get +0.08 market access, a little less than the coast's +0.1. Market access feeds the food buffer and migration, not income directly.
- Light public budget (engine 5): while free schooling is still expanding, it takes 35% of the money that would otherwise extend the grid, or half that for an oil-rich government, so the free-school switch slows electrification. This is a single trade-off, not a fiscal model.
- Free schooling builds up to 0.4 additional coverage gradually. Available income, stability and literate skills affect expansion; war damage erodes it. The policy no longer instantly grants 0.4 extra coverage in the literacy calculation. This is a capacity constraint, not a full fiscal budget or teacher-cohort model.
- Family connection milestones reflect local access. Careers require supporting technologies: drivers require motor cars, modern nurses require germ theory, engineers require railways or electricity, and factory jobs require steam power or sufficient electric service. These are fictional vignettes, not an occupational forecast.
- Household budgets (engine 5): each family earns from its working members' jobs relative to their state's income (farmers 0.7×, clerks 1.5×, engineers 2.5×…). Land work loses up to 60% in a food crisis, and food costs rise with it. Households spend 95% of a normal year's income and lose 15% of savings a year to extended family, weddings and funerals, so savings settle near four months of income. Savings pay school fees (a quarter of a year's income, waived under free schooling), the cost of moving for work and the cost of opening a shop. Schooled children usually learn to read; others sometimes learn at home. These are fictional household rules for the stories, not fitted to household surveys.
- Families use an independent seeded random stream. Adding a family scene cannot change national events or economic results. Saved runs remain deterministic for a given engine version and inputs.
- Drought productivity effects and war damage produce a food-pressure index. Infrastructure, coastal access, railways and fertiliser support market access and a food buffer. Food pressure can reduce the following year's productive capacity and trigger family hardship/recovery scenes. The index is **not a measured hunger rate**.
- Religion and schools (engine 6): before this, no faith could spread beyond where it stood in 1850, because a faith's schools grew only in proportion to its existing believers (Anambra stayed 99% traditional to 2018). Missionary arrivals are now dated events by state, like the British conquest: Badagry and Abeokuta 1842, Calabar 1846, Ibadan and Ogbomoso 1853, Onitsha, Lokoja and Asaba 1857, Bonny 1864, Ondo and Ekiti 1875, Benin 1898, the Igbo heartland 1905, the Middle Belt 1906–11, and none in the emirates under indirect rule. The dates are approximate first-station years. Where missionaries work, their schools grow as if 80% already believed; everywhere else every faith's schools grow from its own believers, with the same rates for every faith. Schools win converts strongly (relSchool 5). Against the 2018 state religion data the mean error fell from 34 to about 10 points.
- A child attends one kind of school: when Quranic, mission, state and free-school places add up to more than all children, each gets its proportional share.
- "Can read" now shows school literacy (reading in the language of formal schooling), the measure the real-world comparison and surveys use; it previously showed literacy in any script against that survey figure. Income, fertility and technology still use literacy in any script, so no faith's schools count for more. In 2018 (5-seed mean) school literacy is about 0.56–0.69 in the south-east (Anambra 0.69), 0.70 in Lagos and Oyo and 0.31 in Kano, Sokoto and Borno; nationally 0.54 against a real 0.60. The order follows DHS primary attendance (rank correlation above 0.4 in the calibration tests), but the south-east is still too low; real literacy there is around 0.9.
- History's free-schooling default is 1976 (Universal Primary Education). Runs starting after it count observed attendance as already built.
- Post-independence crises (engine 5): our coup years (1966, 1975, 1983, 1985, 1993) and the 1967 civil war are counted from independence, so a later independence moves them. At each coup moment a coup happens only if Nigeria's stability is below 0.64 (0.74 with coups set to "likely"). The civil war needs a coup in the previous two years and stability below 0.55. Regional tension in the model is religious only, so no ethnic grievance is invented; the chain coup → shaken state → war is the cause. With every switch at history, the war happens in about three runs in four.
- Fertility transition (engine 5): once an even blend of literacy (any script) and town life passes 0.65, birth rates fall by up to 50 per 1,000 more. Without it the baseline grew 2.5% a year forever (1.5 billion by 2100). With it the baseline gives about 228 million in 2025 (real 238), 348 million in 2050 and 477 million in 2100, matching the UN World Population Prospects 2024 medium projection. The threshold and size are fitted to those numbers, not estimated from fertility surveys.
- Internal migration responds to neighbouring income opportunities and disruption, capped at 2% outflow per cell per year. All flows are calculated simultaneously; arrivals cannot migrate onward in the same step. Population, literate-person counts and faith shares are transferred consistently. This is a closed national model with no international migration, no age-selective migration and no household survey fit.

## Explanations and repeated runs

Version-3 snapshots store the actual numerical income factors used in that step. The ending's regional inspector reads those recorded factors rather than recomputing old recordings with newer coefficients. The factors multiply non-oil productive capacity; technology/world effects and additive oil income also remain. Food pressure is lagged by one step in the income rule. Older recordings without these details show a fallback message.

During playback, the state card ("What's happening here") gives up to three reasons read from the same recording: food hardship or recovery, a coup, war, union or peace in the last 8 years, new technology in the last 10, the income factor that differs most from the population-weighted national level, and strong migration. When nothing stands out it says so.

Ensembles now report the actual ending year, including years beyond 2025. The previous `pop2025` / `litAny2025` fields remain for compatibility, while new outcome ranges use each run's final snapshot. The panel shows the median and 10th–90th percentiles using linear interpolation between sorted sample values. It describes random-seed variation under fixed assumptions, **not a confidence interval, historical uncertainty range or forecast**. A single run has no fabricated spread; mixed ending years are rejected.

The worker retains only small outcome records for the extra runs, rather than 50 full histories, to reduce peak memory use on phones.

Modern starts also treat independence and oil discovery already dated before the start as completed history. They no longer falsely replay in the following year. Explicitly postponed events still fire in the chosen future year.

## Validation and remaining work

Tests cover known survey values, dates, missing data, state joins, independent family randomness, service versus access, gradual school expansion and the electricity HUD reference. The existing 30-seed historical calibration continues to check population, literacy, life expectancy, urbanisation and selected historical events. Passing it does **not** establish the causal validity of the new rules, validate every regional trajectory, or validate 2050/2100 outcomes.

Remaining research includes finer historical population/settlement and polity reconstructions, explicit sensitivity to data and parameter uncertainty, household consumption/employment/migration from GHS-Panel, electricity generation/reliability and fiscal constraints from NERC, environmental exposure, and conflict/displacement calibration. Those datasets have not been silently substituted into the new scenario rules. The historical baseline still contains scheduled events and remains a limited plausibility check, not causal validation.

## Future tech ladder (engine 4)

Eight capabilities sit above the 27 historical technologies: crewed spaceflight, an orbital space station, reusable rockets, a Moon base, fusion power, a crewed Mars landing, asteroid mining and an interstellar probe. They are **never imported**: a polity must invent them itself. Those with a real date (1961, 1971, 2015) count as ahead of the real world when invented earlier; the rest have no real date, so inventing them is a **world first**. Thresholds sit above the knowledge ordinary runs reach by 2100 (about 5.5 in a 5-seed check), so only very fast-learning worlds (the 200 IQ preset reaches about 8 by 1950 and 26 by 2100) get there. These are game assumptions, not forecasts.

## Map surroundings

The Niger and Benue, Lake Chad and Kainji Reservoir come from Natural Earth 1:50m (public domain), placed with the same longitude/latitude fit as the neighbouring countries. Neighbours are not simulated; they show their real-history names for the year (for example Dahomey → French Dahomey → Dahomey → Benin), with approximate dates.

