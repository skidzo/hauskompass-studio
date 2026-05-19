# OpenPV Learnings

OpenPV is useful as an architectural reference for a browser-first geodata application:

```txt
- React
- map view
- Three.js scene
- building geometry loading
- surface classification
- surrounding context
- optional shading / PV analysis
```

For this project, OpenPV terminology is translated:

```txt
simulation building   -> target / assessed building
surrounding buildings -> context / exposure geometry
solar simulation      -> optional later analysis module
```

Do not copy OpenPV website implementation code directly. Treat the repository as learning material because the website is AGPL-3.0 licensed. `@openpv/simshady` is Apache-2.0 and can be evaluated later as an isolated optional dependency.
