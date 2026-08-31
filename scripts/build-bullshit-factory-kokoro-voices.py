#!/usr/bin/env python3
"""Build Bullshit Factory KokovoiceLab presets and export them as an NPZ bundle.

The script deliberately uses KokovoiceLab's interpolation functions and SQLite
format, but exports only the selected cast vectors. Production Kokoro then
loads the NumPy bundle directly and does not import torch or run this authoring
tool for every line of dialogue.
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import os
import re
import sqlite3
from pathlib import Path
from types import ModuleType

import numpy as np


VOICE_NAME = re.compile(r"^[a-z0-9_]+$")


def load_kokovoicelab(root: Path) -> ModuleType:
    module_path = root / "kokovoicelab.py"
    if not module_path.is_file():
        raise FileNotFoundError(f"KokovoiceLab source is missing: {module_path}")
    spec = importlib.util.spec_from_file_location("bullshit_factory_kokovoicelab", module_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load KokovoiceLab from {module_path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def voice_query(name: str) -> str:
    if not VOICE_NAME.fullmatch(name):
        raise ValueError(f"Unsafe or invalid Kokoro voice name: {name!r}")
    return (
        "SELECT name, gender, language, quality, training_duration, style_vector "
        f"FROM voices WHERE name = '{name}'"
    )


def main() -> None:
    script_root = Path(__file__).resolve().parents[1]
    models_root = Path(os.environ.get("BF_MODELS_ROOT", str(script_root / "models")))
    lab_root = Path(os.environ.get("KOKOVOICELAB_ROOT", str(models_root / "kokovoicelab")))
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--lab-root",
        type=Path,
        default=lab_root,
    )
    parser.add_argument(
        "--db-path",
        type=Path,
        default=lab_root / "voices.db",
    )
    parser.add_argument(
        "--presets",
        type=Path,
        default=script_root / "public/bullshit-factory/production/kokovoicelab-voice-presets.json",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=lab_root / "exported_voices" / "bullshit-factory-custom.bin",
    )
    args = parser.parse_args()

    lab = load_kokovoicelab(args.lab_root)
    manifest = json.loads(args.presets.read_text(encoding="utf-8"))
    presets = manifest.get("presets")
    if not isinstance(presets, list) or not presets:
        raise ValueError("The preset manifest does not contain any presets")

    sqlite3.register_adapter(np.ndarray, lab.adapt_array)
    sqlite3.register_converter("array", lab.convert_array)
    connection = sqlite3.connect(args.db_path, detect_types=sqlite3.PARSE_DECLTYPES)
    try:
        cursor = connection.cursor()
        selected_names: list[str] = []
        for preset in presets:
            name = str(preset["name"])
            source = str(preset["source"])
            target = str(preset["target"])
            if not VOICE_NAME.fullmatch(name) or not VOICE_NAME.fullmatch(source) or not VOICE_NAME.fullmatch(target):
                raise ValueError(f"Invalid voice name in preset {name!r}")
            factor = float(preset["factor"])
            if not -2.0 <= factor <= 2.0:
                raise ValueError(f"Interpolation factor for {name} is outside -2..2")
            source_style = lab.get_voice_group_vector(connection, voice_query(source))
            target_style = lab.get_voice_group_vector(connection, voice_query(target))
            style_vector = np.asarray(lab.interpolate_styles(source_style, target_style, factor), dtype=np.float32)
            if style_vector.size <= 0 or not np.isfinite(style_vector).all():
                raise ValueError(f"Generated vector for {name} is empty or non-finite")
            cursor.execute(
                """
                INSERT OR REPLACE INTO voices
                (name, gender, language, quality, training_duration, style_vector, is_synthetic, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    name,
                    str(preset.get("gender", "X")),
                    "en-us",
                    int(preset.get("quality", 85)),
                    None,
                    style_vector,
                    True,
                    str(preset.get("notes", "")),
                ),
            )
            selected_names.append(name)
        connection.commit()

        placeholders = ",".join("?" for _ in selected_names)
        rows = cursor.execute(
            f"SELECT name, style_vector FROM voices WHERE name IN ({placeholders})", selected_names
        ).fetchall()
        vectors = {str(name): np.asarray(vector, dtype=np.float32) for name, vector in rows}
        missing = [name for name in selected_names if name not in vectors]
        if missing:
            raise ValueError(f"The voice database did not return generated presets: {missing}")

        args.output.parent.mkdir(parents=True, exist_ok=True)
        with args.output.open("wb") as output_file:
            np.savez(output_file, **vectors)
        print(f"Exported {len(vectors)} Bullshit Factory KokovoiceLab voices to {args.output}")
    finally:
        connection.close()


if __name__ == "__main__":
    main()
