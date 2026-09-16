from typing import Dict, Any
from app.connectors.base import BaseConnector
from app.core.errors import ExtractionError

class SchemaExtractor:
    def __init__(self, connector: BaseConnector):
        self.connector = connector

    async def extract_all(self) -> Dict[str, Any]:
        try:
            tables = await self.connector.get_tables()
            result = {}
            for t in tables:
                # t may be dict with table_schema/table_name or NAME depending on connector
                table_name = t.get("table_name") or t.get("name") or t.get("name")
                schema = await self.connector.get_table_schema(table_name)
                result[table_name] = schema
            return result
        except Exception as e:
            raise ExtractionError(str(e))
