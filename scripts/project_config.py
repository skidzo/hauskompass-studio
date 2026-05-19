import json
import os
from pathlib import Path


def load_project_config(root: Path) -> dict:
    configured_path = os.environ.get("HAUSKOMPASS_PROJECT_CONFIG")
    candidates = []
    if configured_path:
        candidates.append(Path(configured_path).expanduser())
    candidates.extend([
        root / "project.config.json",
        root / "project.config.example.json",
    ])

    for path in candidates:
        if path.exists():
            return json.loads(path.read_text(encoding="utf-8"))

    raise FileNotFoundError(
        "No project config found. Set HAUSKOMPASS_PROJECT_CONFIG or create project.config.json.",
    )
