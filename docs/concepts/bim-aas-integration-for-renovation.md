# BIM/AAS Integration For Private Renovation

This project should become a practical renovation knowledge system first. It should not try to become full BIM software in the first sprint.

## Practical Mapping

In a private house renovation, BIM/IFC and AAS concepts map to everyday planning objects:

| Renovation object | BIM/IFC-inspired role | AAS-inspired role |
| --- | --- | --- |
| Roof, wall, beam, floor, cellar, terrain | `BuildingElement` with geometry/context and lifecycle status | Referenced host object for product, condition and evidence data |
| Attic, cellar, technical room, PV roof zone | `RoomOrZone` with function and environmental needs | Context for sensors, HVAC and monitoring |
| Insulation system, PV module, inverter, vapor barrier, sensor model | `AssetType` with product-level technical data | Type-like shell for datasheets, EPDs, service life and warranty templates |
| One planned humidity sensor, one installed inverter, one retained beam tag | `AssetInstance` with location, state and lifecycle events | Instance-like shell for serials, installation, warranty, condition and measurements |
| Humidity, temperature, moisture, PV yield, inspection result | `Measurement` or observation stream | Operational data linked to the installed/planned asset instance |
| Photos, PDFs, quotes, invoices, datasheets, inspection notes | `EvidenceDocument` | Source/evidence link for claims and decisions |
| PV setback, roof U-value target, humidity threshold | `Requirement` | Lightweight IDS-like information need that can later be checked |

## Why Geometry, Product Data And Operational Data Stay Separate

Building geometry answers: where is something, what does it touch, what is retained, what is removed, and how does it relate to the hull.

Product data answers: what product/system type could be used, what are its technical properties, service life, environmental data and documentation.

Operational data answers: what happened after installation or observation, including sensor values, maintenance events, failures and inspections.

Putting all of that into one object creates duplication. A roof surface should not contain the full specification of every planned PV module, insulation product and humidity sensor. It should link to the relevant asset instances. Those instances can link to asset types. Measurements can then link to instances. This keeps the model editable for years.

## Why This Matters For Long-Running Decisions

Renovation decisions often remain open for months or years. The model must survive partial knowledge:

- The roof geometry can be known before the insulation product is selected.
- A PV zone can be planned before a module model is selected.
- A timber beam can be marked retained before its final surface treatment is known.
- A humidity sensor can be planned before it is installed.
- A photo can confirm a defect before a repair method is chosen.
- A requirement can exist before there is enough data to validate it.

Stable IDs and separated entities allow the project to update one layer without rewriting every other layer.

## Renovation Use Cases

### PV

PV planning needs roof surface geometry, slope/orientation, obstruction zones, safety setbacks, asset types for modules/inverters/mounting systems, asset instances for planned arrays, and measurements for later yield or monitoring data. The roof element should link to the planned PV asset instance; it should not duplicate module specifications.

### Roof Insulation

Roof insulation needs existing roof structure, retained timber, planned insulation layer/system, vapor control layer, ventilation assumptions, thermal requirements and moisture-risk evidence. The insulation system belongs in `AssetType`; the planned installed layer belongs in `AssetInstance`; the roof or attic zone only links to it.

### HVAC And Building Services

Heating, ventilation, electrical, water, drainage, smart-home sensors and monitoring devices are assets. Product data belongs in `AssetType`. Installed or planned devices belong in `AssetInstance`. Rooms/zones and building elements provide location and host context.

### Sensors And Moisture Monitoring

Humidity and temperature sensors should be asset instances. Each measurement must reference the sensor instance, not just a room string. This makes it possible to replace a sensor later without losing the history of what was measured where.

### Deconstruction Planning

Deconstruction needs lifecycle status: existing and retained, existing and removed, new, temporary, unknown. It also needs evidence of material condition, reuse potential, disposal route, and environmental data where available. This sprint keeps that information optional but structurally possible.

## Future Integration Points

### IFC

IFC is the likely long-term exchange format for building model data. buildingSMART describes IFC as an open standard for data exchange in the built asset industry, and IFC 4.3 is published as ISO 16739-1:2024.

For now:

- create IFC-inspired internal entities;
- avoid hard dependency on BIM authoring tools;
- keep export/import as future work.

### BCF

BCF should inspire renovation issues, annotations and model-based discussion. buildingSMART describes BCF as a format for communicating model-based issues between BIM applications.

For now:

- define internal `AssessmentFinding` records for defects, missing information, requirement gaps and design issues;
- allow findings to reference building elements, photos, coordinates and decisions;
- do not implement BCF exchange yet.

### IDS

IDS should inspire future validation of required information. buildingSMART describes IDS as a standard for defining information requirements in computer-interpretable form and enabling automatic checking of IFC model data.

For now:

- define lightweight `Requirement` entities;
- allow requirements to be checked against known data;
- do not implement full IDS parsing yet.

### AAS

AAS concepts are useful for stable IDs, asset types, asset instances, submodels, product documentation and operational data. A full AAS server is not required for this repository yet.

For now:

- keep AAS-inspired JSON;
- keep source/evidence links explicit;
- do not generate AAS packages until the local model has enough reliable measured data.
