# Next Development Priorities

## Recommended Order

1. Lock the current evidence model:
   Keep LoD2 parts 1 and 2 as the confirmed object of interest. Keep references 3, 4, 5, 6 and 9 as neighbour context.

2. Extract combined hull metrics:
   Compute the combined footprint, total ground area, roof area per building part, ridge/eaves height estimates and orientation from the current LoD2 surfaces.

3. Add DGM1 terrain sampling:
   Clip or sample the DGM1 tile around the two confirmed parts and retained neighbour references. Compute local slope, height differences, drainage direction and entrance/yard terrain relations.

4. Render real geometry:
   Replace 2D-only footprint review with a simple 3D LoD2 surface viewer for the selected part and then for the combined two-part object.

5. Build the assessment checklist:
   Turn missing measurements into evidence tasks: roof structure, wall thickness, moisture/cellar, foundation/ground contact, openings, reuseable timber and roof unification feasibility.

6. Expand evidence inspection:
   Add synthetic IFC metadata and document evidence fixtures, then define a narrow `ifc-inspector` adapter that emits `BuildingElementEvidence`. Keep matching as reviewable suggestions until contradiction and ambiguity tests exist.

## Heritage Check Snapshot

Official Bayerischer Denkmal-Atlas coordinate search was checked around the current address point.

```txt
150 m: no JSON result returned by the service
250 m: 2 results
nearest: Bodendenkmal D-3-6540-0055 at about 206.9 m
nearest Baudenkmal: Kapelle D-3-76-151-8 at about 212.2 m
```

This suggests no direct DenkmalAtlas hit at the house coordinate in the checked radius. The nearby results are likely irrelevant for the current renovation baseline, so heritage is archived as a traceability note and not treated as an active workstream.
