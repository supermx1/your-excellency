"""Offline, area-weighted HYDE/ISIMIP counts in modern Nigerian state footprints.

Optional rebuild: install requirements-history.txt into a local venv, then run this file.
The normal JavaScript data build uses the checked-in, compact reference extract.
"""
import hashlib
import json
from pathlib import Path
from urllib.request import urlopen

import netCDF4
import numpy as np
from shapely.geometry import box, shape

ROOT = Path(__file__).resolve().parent
POP_URL = 'https://files.isimip.org/ISIMIP2b/InputData/population/histsoc/population_histsoc_0p5deg_annual_1861-2005.nc4'
POP_SHA512 = 'e5d2aade6461a9ddbccf646710a11856db8c8995236c446f67e6238ac54b1125d927c4d0e63dd21ef83ed6ac8dab0ebebc4199c1afd67d51cb1a70be2117000b'
BOUND_URL = 'https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/NGA/ADM1/geoBoundaries-NGA-ADM1_simplified.geojson'


def grid_weights(boundaries, lats, lons, resolution):
    """Fraction of each grid cell assigned to each polygon, including holes.

    Counts are assumed uniform inside each 0.5-degree source cell. Fractions use
    planar lon/lat area within that small cell; this is an approximation, not a
    settlement-level reconstruction. Foreign portions of edge cells are clipped.
    """
    half = resolution / 2
    rectangles = [box(lon-half, lat-half, lon+half, lat+half) for lat in lats for lon in lons]
    weights = np.array([[shape(geometry).intersection(rect).area / rect.area for rect in rectangles] for geometry in boundaries])
    if np.any(weights.sum(axis=0) > 1.001):
        raise ValueError('State boundaries overlap; population would be double-counted')
    return weights


def aggregate_counts(weights, values):
    data = np.ma.filled(values, 0).flatten()
    if np.any(~np.isfinite(data)) or np.any(data < 0):
        raise ValueError('Invalid population grid values')
    return weights @ data


def cached(name, url):
    path = ROOT / '.cache' / name
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        with urlopen(url, timeout=90) as response:
            body = response.read()
        temporary = path.with_suffix('.partial')
        temporary.write_bytes(body)
        temporary.replace(path)
    return path


def main():
    population = cached('historical-population.nc4', POP_URL)
    if hashlib.sha512(population.read_bytes()).hexdigest() != POP_SHA512:
        raise ValueError('ISIMIP population file checksum mismatch')
    boundary_file = cached('nga-adm1.geojson', BOUND_URL)
    features = json.loads(boundary_file.read_text())['features']
    aliases = {'Abuja Federal Capital Territory': 'fct', 'Nasarawa': 'nassarawa'}
    ids = [aliases.get(f['properties']['shapeName'], f['properties']['shapeName'].lower().replace(' ', '-')) for f in features]
    expected = {c['id'] for c in json.loads((ROOT / '../../src/lib/game/sim/data/cells.json').read_text())}
    if set(ids) != expected or len(ids) != len(expected):
        raise ValueError('Boundary identifiers do not cover the 37 game cells exactly once')
    geometries = [shape(f['geometry']) for f in features]
    bounds = np.array([g.bounds for g in geometries])
    with netCDF4.Dataset(population) as dataset:
        lat, lon = dataset['lat'][:], dataset['lon'][:]
        lat_indices = np.where((lat >= bounds[:, 1].min()-.5) & (lat <= bounds[:, 3].max()+.5))[0]
        lon_indices = np.where((lon >= bounds[:, 0].min()-.5) & (lon <= bounds[:, 2].max()+.5))[0]
        weights = grid_weights([f['geometry'] for f in features], lat[lat_indices], lon[lon_indices], .5)
        if dataset['number_of_people'].units != '1':
            raise ValueError('Expected counts per cell, not population density')
        years = np.array(dataset['time'][:], dtype=int) + 1860
        snapshots = {}
        for year in [1861, 1870, 1880, 1890, 1900, 1910, 1920, 1930, 1940, 1950, 1960, 1970, 1980, 1990, 2000]:
            values = dataset['number_of_people'][int(np.where(years == year)[0][0]), lat_indices, lon_indices]
            counts = aggregate_counts(weights, values)
            if np.any(counts <= 0):
                raise ValueError(f'Missing or empty state in {year}')
            snapshots[str(year)] = {id: round(float(count), 3) for id, count in zip(ids, counts)}
    result = {
        'schemaVersion': 1,
        'method': 'Area-weighted 0.5-degree population counts, clipped to modern state footprints; uniform within each grid cell. Shares are rescaled to the game national population series.',
        'earliestYear': 1861,
        'caveats': [
            '1850 uses the 1861 spatial distribution as an explicit proxy; there is no 1850 grid in this extract.',
            'HYDE/ISIMIP is a historical reconstruction, not a census. The coarse grid cannot resolve individual settlements.',
            'Modern state footprints are reporting units only, not historical boundaries or polities.',
            'National totals use the existing OWID/UN series; gridded counts determine regional shares only.'
        ],
        'snapshots': snapshots,
        'sources': [
            {'name': 'HYDE 3.2 via ISIMIP2b — historical gridded population, 1861–2005 (0.5°)', 'url': 'https://data.isimip.org/datasets/9ae3c6f3-9a6d-49c1-9ee4-c24fb966d418/', 'licence': 'CC BY 4.0; cite HYDE (Klein Goldewijk et al., 2017) and ISIMIP', 'files': ['regional.json'], 'download': POP_URL, 'sha512': POP_SHA512},
            {'name': 'GRID3 / geoBoundaries gbOpen Nigeria ADM1 — modern state aggregation footprints', 'url': 'https://www.geoboundaries.org/api.html', 'licence': 'CC BY 4.0; GRID3 and geoBoundaries', 'files': ['regional.json'], 'download': BOUND_URL, 'sha256': hashlib.sha256(boundary_file.read_bytes()).hexdigest(), 'boundaryId': 'NGA-ADM1-27671186'}
        ]
    }
    target = ROOT / 'reference' / 'historical-population.json'
    target.parent.mkdir(exist_ok=True)
    target.write_text(json.dumps(result, separators=(',', ':')) + '\n')
    print(f'Historical extract: {len(snapshots)} years × {len(ids)} areas; {target.stat().st_size} bytes')


if __name__ == '__main__':
    main()
