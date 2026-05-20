#!/usr/bin/env python3
import runpy
from pathlib import Path

runpy.run_path(str(Path(__file__).resolve().parents[1] / "utils/py/spatial/download_lgl_bw_lod2.py"), run_name="__main__")
