/**
 * Adapter that converts a normalized IFC-like JSON element into a
 * BuildingElementEvidence record used by the evidence inspection domain.
 *
 * This adapter works exclusively with the normalized intermediate format
 * (NormalizedIfcElement). It does not parse raw IFC files.
 */

import type { BuildingElementEvidence, EvidenceQualityFlag } from './EvidenceInspection';

/**
 * A normalized, IFC-inspired element record.
 * The shape is technology-neutral — it can be derived from IFC-JSON,
 * web-IFC parsing, or manually authored fixtures.
 */
export type NormalizedIfcElement = {
    /** IFC GlobalId (22-char base64url). Null when absent or unparseable. */
    globalId: string | null;
    /** Human-readable element name from IFC Name attribute. */
    name: string;
    /** IFC entity class, e.g. 'IfcWall', 'IfcSlab', 'IfcBeam'. */
    ifcClass: string;
    /** Material name from the associated IfcMaterial or IfcMaterialLayerSet. */
    material?: string;
    /** Primary scalar quantity from IfcElementQuantity (e.g. GrossArea, Length). */
    baseQuantity?: {
        value: number;
        unit: string;
    };
};

/** Maps an IfcClass string to a generic element-type label. */
function elementTypeFromIfcClass(ifcClass: string): string {
    const normalized = ifcClass.replace(/^Ifc/i, '').toLowerCase();
    return normalized || 'unknown';
}

/**
 * Converts a single NormalizedIfcElement into a BuildingElementEvidence record.
 *
 * Quality rules:
 * - globalId null          → confidence: 'low',    flag: 'ambiguous-identity'
 * - material absent        → confidence: 'medium',  flag: 'needs-expert-review'
 * - baseQuantity absent    → confidence: 'medium',  flag: 'estimated-value'
 * - all fields present     → confidence: 'high',    no flags
 *
 * When multiple conditions are present, the lowest applicable confidence is used
 * and all relevant flags are collected.
 *
 * @param element   The normalized IFC element to convert.
 * @param sourceRefId  The ID of the EvidenceSourceRef that provided this element.
 * @returns A BuildingElementEvidence record ready for use in an EvidenceReport.
 */
export function adaptIfcElementToEvidence(
    element: NormalizedIfcElement,
    sourceRefId: string,
): BuildingElementEvidence {
    const flags: EvidenceQualityFlag[] = [];
    const explanationParts: string[] = [];

    if (element.globalId === null || element.globalId.trim() === '') {
        flags.push('ambiguous-identity');
        explanationParts.push('Element has no stable GlobalId — identity cannot be reliably tracked.');
    }

    if (element.material === undefined || element.material.trim() === '') {
        flags.push('needs-expert-review');
        explanationParts.push('Material is not recorded in the IFC metadata.');
    }

    if (element.baseQuantity === undefined) {
        flags.push('estimated-value');
        explanationParts.push('No base quantity found in the IFC metadata; value must be estimated or measured.');
    }

    // Determine confidence from the most critical flag present.
    let confidence: BuildingElementEvidence['quality']['confidence'] = 'high';
    if (flags.includes('ambiguous-identity')) {
        confidence = 'low';
    } else if (flags.includes('needs-expert-review') || flags.includes('estimated-value')) {
        confidence = 'medium';
    }

    const explanation =
        explanationParts.length > 0
            ? explanationParts.join(' ')
            : 'IFC element has complete metadata — identity, material and quantity are all present.';

    const stableElementId =
        element.globalId !== null && element.globalId.trim() !== ''
            ? `ifc:${element.globalId}`
            : undefined;

    return {
        id: `ifc-evidence:${element.globalId ?? 'no-id'}:${element.name}`,
        stableElementId,
        label: element.name,
        elementType: elementTypeFromIfcClass(element.ifcClass),
        material: element.material,
        quantity: element.baseQuantity,
        sourceRefs: [sourceRefId],
        quality: {
            confidence,
            flags,
            explanation,
        },
    };
}
