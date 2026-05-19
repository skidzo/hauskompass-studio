# Project Character Model

## Purpose

The Studio needs to understand whether a project is a focused single-project assessment or a broader workshop-oriented spatial project. This distinction should influence available views, spatial tools and expectations.

## Core Fields

- `projectType`: broad operational type, for example `assessment`, `workshop`, `hybrid` or `reference`.
- `projectCharacter`: spatial and social character, for example `single_building`, `small_cluster`, `campus`, `settlement`, `district_fragment`, `socially_relevant_workshop_project`.
- `projectScale`: `small`, `medium`, `large`, `very_large`.
- `siteComplexity`: `low`, `medium`, `high`, `very_high`.
- `stakeholderComplexity`: `low`, `medium`, `high`, `very_high`.
- `workshopMode`: `none`, `light`, `full`.
- `singleProjectMode`: `none`, `light`, `full`.
- `spatialModelAvailability`: `none`, `map_only`, `terrain`, `building_hulls`, `ifc`, `mixed`.

## Interpretation

Focused projects usually have `singleProjectMode` set to `light` or `full`, smaller scale and stronger building-level modeling expectations.

Workshop projects usually have `workshopMode` set to `light` or `full`, larger spatial complexity and stronger need for zones, evidence linking, scene preparation and interpretation support.

Hybrid projects can use both tracks, for example a single listed building embedded in a socially relevant neighborhood or campus transformation.

## Current Eiermann Classification

The Eiermann-Campus is a `hybrid` project with `campus` character, `large` scale, high site and stakeholder complexity, full workshop mode and mixed spatial model availability.
