#!/usr/bin/env python3
import runpy
from pathlib import Path

runpy.run_path(str(Path(__file__).resolve().parents[1] / "utils/py/spatial/gml_to_zone_geojson.py"), run_name="__main__")
