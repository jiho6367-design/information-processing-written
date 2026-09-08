from __future__ import annotations

import json
import shutil
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "src" / "data" / "exams"
PUBLIC_DIR = ROOT / "public" / "data" / "exams"


def main() -> None:
    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)

    manifest = []
    for source in sorted(SOURCE_DIR.glob("20*.json")):
        target = PUBLIC_DIR / source.name
        shutil.copyfile(source, target)
        exam_id = source.stem
        manifest.append(
            {
                "id": exam_id,
                "fileName": exam_id,
                "path": f"/data/exams/{source.name}",
            }
        )

    (PUBLIC_DIR / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"synced {len(manifest)} exam files to {PUBLIC_DIR}")


if __name__ == "__main__":
    main()
