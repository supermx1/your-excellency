import unittest
import numpy as np
from shapely.geometry import box, mapping
from extract_history import grid_weights, aggregate_counts

class HistoricalAggregationTests(unittest.TestCase):
    def test_split_grid_cell_conserves_population(self):
        boundaries = [mapping(box(0, 0, .25, .5)), mapping(box(.25, 0, .5, .5))]
        weights = grid_weights(boundaries, np.array([.25]), np.array([.25]), .5)
        counts = aggregate_counts(weights, np.array([[100.]]))
        np.testing.assert_allclose(counts, [50, 50])

    def test_holes_and_missing_ocean_cells_are_excluded(self):
        polygon = box(0, 0, 1, 1).difference(box(0, 0, .5, .5))
        weights = grid_weights([mapping(polygon)], np.array([.25, .75]), np.array([.25, .75]), .5)
        counts = aggregate_counts(weights, np.ma.array([[100, 100], [100, 100]], mask=[[False, False], [True, False]]))
        np.testing.assert_allclose(counts, [200])

    def test_overlapping_boundaries_fail_instead_of_double_counting(self):
        with self.assertRaisesRegex(ValueError, 'overlap'):
            grid_weights([mapping(box(0, 0, .5, .5))] * 2, np.array([.25]), np.array([.25]), .5)

if __name__ == '__main__':
    unittest.main()
