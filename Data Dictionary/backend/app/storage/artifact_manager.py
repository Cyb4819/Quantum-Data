import json
import os
from datetime import datetime

ARTIFACT_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "artifacts")
ARTIFACT_DIR = os.path.abspath(ARTIFACT_DIR)

os.makedirs(ARTIFACT_DIR, exist_ok=True)


def save_json(name: str, data: dict) -> str:
    ts = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    filename = f"{name}_{ts}.json"
    path = os.path.join(ARTIFACT_DIR, filename)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    return path


def save_markdown_for_table(table_name: str, schema: dict) -> str:
    ts = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    filename = f"{table_name}_{ts}.md"
    path = os.path.join(ARTIFACT_DIR, filename)
    with open(path, "w", encoding="utf-8") as f:
        f.write(f"# Table: {table_name}\n\n")
        cols = schema.get("columns") or []
        f.write("| Column | Data Type | Nullable |\n")
        f.write("|---|---:|---:|\n")
        for c in cols:
            name = c.get("column_name") or c.get("name") or str(c.get(0, ""))
            dtype = c.get("data_type") or c.get("type") or ""
            nullable = c.get("is_nullable") or c.get("nullable") or ""
            f.write(f"| {name} | {dtype} | {nullable} |\n")
    return path
