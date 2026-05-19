import { describe, expect, it } from 'vitest';
import { adaptIfcElementToEvidence } from '../src/domain/ifcMetadataAdapter';
import {
    ifcFixtureAmbiguousIdentity,
    ifcFixtureComplete,
    ifcFixtureMissingMaterial,
    ifcFixtureMissingQuantity,
} from './fixtures/ifcMetadata.fixtures';

const SOURCE_REF_ID = 'source-ifc-synthetic-fixture';

describe('ifcMetadataAdapter', () => {
    describe('complete fixture', () => {
        it('maps elementType from IfcClass', () => {
            const result = adaptIfcElementToEvidence(ifcFixtureComplete, SOURCE_REF_ID);
            expect(result.elementType).toBe('wall');
        });

        it('preserves label and material', () => {
            const result = adaptIfcElementToEvidence(ifcFixtureComplete, SOURCE_REF_ID);
            expect(result.label).toBe(ifcFixtureComplete.name);
            expect(result.material).toBe('Concrete');
        });

        it('preserves base quantity', () => {
            const result = adaptIfcElementToEvidence(ifcFixtureComplete, SOURCE_REF_ID);
            expect(result.quantity).toEqual({ value: 14.4, unit: 'm2' });
        });

        it('sets stableElementId from globalId', () => {
            const result = adaptIfcElementToEvidence(ifcFixtureComplete, SOURCE_REF_ID);
            expect(result.stableElementId).toBe(`ifc:${ifcFixtureComplete.globalId}`);
        });

        it('produces high confidence with no quality flags', () => {
            const result = adaptIfcElementToEvidence(ifcFixtureComplete, SOURCE_REF_ID);
            expect(result.quality.confidence).toBe('high');
            expect(result.quality.flags).toHaveLength(0);
        });

        it('links to the given sourceRefId', () => {
            const result = adaptIfcElementToEvidence(ifcFixtureComplete, SOURCE_REF_ID);
            expect(result.sourceRefs).toContain(SOURCE_REF_ID);
        });
    });

    describe('missing-material fixture', () => {
        it('produces medium confidence', () => {
            const result = adaptIfcElementToEvidence(ifcFixtureMissingMaterial, SOURCE_REF_ID);
            expect(result.quality.confidence).toBe('medium');
        });

        it('flags needs-expert-review', () => {
            const result = adaptIfcElementToEvidence(ifcFixtureMissingMaterial, SOURCE_REF_ID);
            expect(result.quality.flags).toContain('needs-expert-review');
        });

        it('omits material from output', () => {
            const result = adaptIfcElementToEvidence(ifcFixtureMissingMaterial, SOURCE_REF_ID);
            expect(result.material).toBeUndefined();
        });

        it('still sets stableElementId when globalId is present', () => {
            const result = adaptIfcElementToEvidence(ifcFixtureMissingMaterial, SOURCE_REF_ID);
            expect(result.stableElementId).toBe(`ifc:${ifcFixtureMissingMaterial.globalId}`);
        });
    });

    describe('missing-quantity fixture', () => {
        it('produces medium confidence', () => {
            const result = adaptIfcElementToEvidence(ifcFixtureMissingQuantity, SOURCE_REF_ID);
            expect(result.quality.confidence).toBe('medium');
        });

        it('flags estimated-value', () => {
            const result = adaptIfcElementToEvidence(ifcFixtureMissingQuantity, SOURCE_REF_ID);
            expect(result.quality.flags).toContain('estimated-value');
        });

        it('omits quantity from output', () => {
            const result = adaptIfcElementToEvidence(ifcFixtureMissingQuantity, SOURCE_REF_ID);
            expect(result.quantity).toBeUndefined();
        });

        it('maps IfcSlab to slab element type', () => {
            const result = adaptIfcElementToEvidence(ifcFixtureMissingQuantity, SOURCE_REF_ID);
            expect(result.elementType).toBe('slab');
        });
    });

    describe('ambiguous-identity fixture', () => {
        it('produces low confidence', () => {
            const result = adaptIfcElementToEvidence(ifcFixtureAmbiguousIdentity, SOURCE_REF_ID);
            expect(result.quality.confidence).toBe('low');
        });

        it('flags ambiguous-identity', () => {
            const result = adaptIfcElementToEvidence(ifcFixtureAmbiguousIdentity, SOURCE_REF_ID);
            expect(result.quality.flags).toContain('ambiguous-identity');
        });

        it('omits stableElementId when globalId is null', () => {
            const result = adaptIfcElementToEvidence(ifcFixtureAmbiguousIdentity, SOURCE_REF_ID);
            expect(result.stableElementId).toBeUndefined();
        });

        it('still maps material and quantity from the fixture', () => {
            const result = adaptIfcElementToEvidence(ifcFixtureAmbiguousIdentity, SOURCE_REF_ID);
            expect(result.material).toBe('Steel');
            expect(result.quantity).toEqual({ value: 3.6, unit: 'm' });
        });
    });
});
