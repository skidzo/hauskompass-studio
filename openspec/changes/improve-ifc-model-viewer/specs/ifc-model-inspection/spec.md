## ADDED Requirements

### Requirement: Dominant responsive IFC viewport

The system SHALL present the Building tab IFC Model as a dominant responsive 3D viewport that uses the available workspace instead of a fixed-height secondary panel.

#### Scenario: Desktop IFC model view is opened

- **WHEN** the user opens Building -> IFC Model on a desktop-sized viewport
- **THEN** the IFC canvas uses most of the available Building tab height and width
- **AND** supporting metrics or legends do not permanently consume a large share of horizontal model space.

#### Scenario: Narrow IFC model view is opened

- **WHEN** the user opens Building -> IFC Model on a narrow viewport
- **THEN** the viewer remains usable without horizontal overflow
- **AND** supporting information stacks, collapses or moves below the model.

### Requirement: Compact inspection controls

The system SHALL provide compact IFC inspection controls for framing, view presets, old/new visibility, color mode and focus or fullscreen-style viewing.

#### Scenario: User changes the view

- **WHEN** the user chooses a named view preset or framing action
- **THEN** the camera frames the currently visible IFC geometry
- **AND** the controls remain responsive after resize or focus mode changes.

#### Scenario: User toggles model display modes

- **WHEN** the user toggles old/new visibility or type/original colors
- **THEN** the displayed geometry updates without reloading the IFC file
- **AND** the active display state is visible in the toolbar.

### Requirement: Evidence-aware model context

The system SHALL keep IFC source, generated-data status and uncertainty context available inside the viewer without obscuring inspection.

#### Scenario: User inspects the model

- **WHEN** the IFC model is ready
- **THEN** source context such as LoD2, DGM1 and generated IFC status remains available
- **AND** the UI does not present the model as measured as-built geometry.

### Requirement: Improved visual legibility

The system SHALL improve IFC visual legibility through clear contrast, edge/outline treatment, readable legends and non-obstructive status badges.

#### Scenario: Model is rendered

- **WHEN** wall, roof, window, ground and terrain elements are visible
- **THEN** their visual categories remain distinguishable
- **AND** legends or badges do not cover important model geometry by default.

