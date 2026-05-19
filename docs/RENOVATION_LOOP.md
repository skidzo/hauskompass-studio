# Renovation Loop

Renovation planning is circular. Each pass reduces uncertainty, creates better questions and updates the model. The repository should support this loop without pretending that generated data is measured reality.

## 1. Baseline Capture

Purpose: collect the starting state of the property and existing building.

Expected inputs: public geodata, LoD2/DGM context, photos, sketches, existing documents, owner knowledge.

Expected outputs: initial project inventory, rough building parts, evidence list, privacy boundaries.

Typical questions: What exists? Which data is public? Which data is private? What should not be committed?

Risks: mixing private data into git, over-trusting public geometry, losing source provenance.

Software support: data inventory, source register, privacy rules, evidence records.

## 2. Data Import And Normalization

Purpose: turn raw source material into consistent internal records.

Expected inputs: cached geodata, generated TypeScript data, metadata JSON, notes, images, IFC exports.

Expected outputs: normalized building facts, geometry references, evidence links, generated artifacts.

Typical questions: Which file produced this value? Is the value measured, imported, inferred or estimated?

Risks: silent coordinate assumptions, stale generated files, duplicate facts.

Software support: import scripts, metadata validator, generated/source file separation.

## 3. Building Hull And Terrain Understanding

Purpose: understand the physical hull, terrain relationship, roof zones and critical exposure.

Expected inputs: LoD2 hull, DGM terrain, generated cross sections, Part 1 decomposition, IFC view.

Expected outputs: hull elements, terrain sections, side elevations, geometry assumptions.

Typical questions: Where does terrain meet the hull? Which sides are weather-critical? Which roof areas are PV-relevant?

Risks: treating LoD2 as measured as-built geometry, missing roof overhangs, confusing Part 1 sub-parts.

Software support: 3D viewer, side-elevation sheets, Part 1 plan views, terrain panels.

## 4. Assumption Registration

Purpose: make every important uncertain statement visible and reviewable.

Expected inputs: generated models, user corrections, known unknowns, code-embedded estimates.

Expected outputs: assumption register with confidence, affected decisions and verification needs.

Typical questions: What did we assume? Why does it matter? What decision would change if it is wrong?

Risks: implicit assumptions drive renovation decisions without being challenged.

Software support: assumptions register, confidence labels, finding links.

## 5. Missing Measurement Identification

Purpose: identify the smallest useful set of measurements that reduces the most uncertainty.

Expected inputs: assumptions, blocked decisions, side-elevation dimensions, site visit plan.

Expected outputs: prioritized measurement needs, suggested methods, blocked decision links.

Typical questions: What should be measured next? Which measurement unblocks roof, PV, insulation or moisture decisions?

Risks: measuring too much low-value detail while missing one critical datum.

Software support: missing measurement board, shot list, laser-reference protocol.

## 6. Renovation Option Framing

Purpose: describe realistic intervention options without committing too early.

Expected inputs: known facts, assumptions, risks, requirements, existing geometry and asset candidates.

Expected outputs: option cards for roof insulation, PV, drainage, deconstruction, HVAC and envelope work.

Typical questions: What are the viable options? What would each require? What evidence is missing?

Risks: optimizing a generated model instead of the real building.

Software support: decision board, requirement links, scenario registry.

## 7. Risk And Dependency Analysis

Purpose: expose uncertainty, safety, cost, sequencing and dependency risks.

Expected inputs: assumptions, findings, requirements, decisions, evidence and measurements.

Expected outputs: risk register, blocked decisions, next action priorities.

Typical questions: What could go wrong? Which decisions depend on unverified roof build-up, moisture or structure?

Risks: hidden dependency chains, premature product selection, ignoring temporary works.

Software support: risk cards, assessment findings, agentic reasoning panel.

## 8. Expert Validation

Purpose: prepare focused questions for architects, energy consultants, engineers and craftspeople.

Expected inputs: structured facts, assumptions, photos, measurements, risks and option framing.

Expected outputs: question list, expert feedback, validated or rejected assumptions.

Typical questions: What should I ask an architect? What must a structural engineer verify? What should an energy consultant know first?

Risks: asking vague questions or presenting estimates as facts.

Software support: expert question preparation, handoff reports, evidence bundles.

## 9. Decision Documentation

Purpose: record what was decided, why, and what evidence supported it.

Expected inputs: expert feedback, validated facts, options, risks, requirements and constraints.

Expected outputs: renovation decisions with status, selected option, dependencies and evidence.

Typical questions: Why did we select this route? What was rejected? What must still be checked?

Risks: decisions become untraceable after weeks or after contractor discussions.

Software support: decision board, changelog, finding/requirement links.

## 10. Implementation Preparation

Purpose: turn decisions into practical preparation for planning, quotes and site work.

Expected inputs: decisions, drawings, evidence, requirements, product candidates, measurement records.

Expected outputs: packages for architects, engineers, energy consultants and trades.

Typical questions: What needs to be in a quote request? Which measurements and photos should be attached?

Risks: insufficient specification, missing sequencing constraints, unclear temporary protection.

Software support: project print, Codex handoff, exportable Markdown summaries.

## 11. As-Built Update And Feedback

Purpose: feed built reality back into the repository after work or additional measurements.

Expected inputs: as-built photos, invoices, product datasheets, sensor data, inspection reports, updated geometry.

Expected outputs: revised facts, installed asset instances, measurements, closed findings, updated decisions.

Typical questions: What changed? Which assumptions were resolved? What is now measured?

Risks: final documentation is lost, product data is disconnected from the building model.

Software support: asset instance updates, evidence ingestion, finding status changes, generated handoff updates.
