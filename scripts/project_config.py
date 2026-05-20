import importlib.util
from pathlib import Path

CANONICAL = Path(__file__).resolve().parents[1] / "utils/py/common/project_config.py"
SPEC = importlib.util.spec_from_file_location("_hauskompass_project_config", CANONICAL)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(MODULE)

load_project_config = MODULE.load_project_config

__all__ = ["load_project_config"]
