/**
 * Synthetic IFC-like JSON fixtures for ifcMetadataAdapter tests.
 * These do not correspond to any real building or project data.
 * They cover the four adapter test cases: complete, missing-material,
 * missing-quantity, and ambiguous-identity.
 */

import type { NormalizedIfcElement } from '../../src/domain/ifcMetadataAdapter';

/** Case 1: All fields present — adapter should produce high-confidence evidence with no flags. */
export const ifcFixtureComplete: NormalizedIfcElement = {
    globalId: '2B3KLmN0P1QrStu9VwXyZa',
    name: 'Synthetic Concrete Wall W01',
    ifcClass: 'IfcWall',
    material: 'Concrete',
    baseQuantity: { value: 14.4, unit: 'm2' },
};

/** Case 2: Material absent — adapter should lower confidence and flag needs-expert-review. */
export const ifcFixtureMissingMaterial: NormalizedIfcElement = {
    globalId: '3C4DLmN0P2QrStu9VwXyZb',
    name: 'Synthetic Unknown-Material Wall W02',
    ifcClass: 'IfcWall',
    material: undefined,
    baseQuantity: { value: 8.0, unit: 'm2' },
};

/** Case 3: Quantity absent — adapter should lower confidence and flag estimated-value. */
export const ifcFixtureMissingQuantity: NormalizedIfcElement = {
    globalId: '4D5ELmN0P3QrStu9VwXyZc',
    name: 'Synthetic Slab Without Area S01',
    ifcClass: 'IfcSlab',
    material: 'Reinforced Concrete',
    baseQuantity: undefined,
};

/** Case 4: GlobalId null — adapter should produce low-confidence evidence and flag ambiguous-identity. */
export const ifcFixtureAmbiguousIdentity: NormalizedIfcElement = {
    globalId: null,
    name: 'Synthetic Unidentified Beam B01',
    ifcClass: 'IfcBeam',
    material: 'Steel',
    baseQuantity: { value: 3.6, unit: 'm' },
};
