from typing import Any, Dict, List, Optional
import math

from motor.motor_asyncio import AsyncIOMotorClient

from app.config import settings
from app.connectors.base import BaseConnector
from app.core.errors import ConnectorError


class MongoDBConnector(BaseConnector):
	def __init__(self, uri: Optional[str] = None, database: Optional[str] = None):
		self.uri = uri or settings.MONGODB_URI
		self.database_name = database or settings.MONGODB_DB
		self.client: Optional[AsyncIOMotorClient] = None
		self.database = None

	async def connect(self):
		if not self.uri:
			raise ConnectorError("MongoDB URI is not configured")

		try:
			self.client = AsyncIOMotorClient(self.uri, serverSelectionTimeoutMS=5000)
			self.database = self.client[self.database_name] if self.database_name else self.client.get_default_database()
			if self.database is None:
				raise ConnectorError("MongoDB database is missing from the URI or request")
			await self.database.command("ping")
		except ConnectorError:
			raise
		except Exception as error:
			if self.client:
				self.client.close()
			raise ConnectorError(f"MongoDB connection failed: {error}") from error

	async def get_tables(self) -> List[Dict[str, Any]]:
		if self.database is None:
			await self.connect()
		try:
			collections = await self.database.list_collection_names()
			return [{"name": name} for name in collections if not name.startswith("system.")]
		except Exception as error:
			raise ConnectorError(f"MongoDB collection lookup failed: {error}") from error

	async def get_table_schema(self, table_name: str) -> Dict[str, Any]:
		if self.database is None:
			await self.connect()

		try:
			documents = await self.database[table_name].find({}, limit=100).to_list(length=100)
			field_types: Dict[str, set[str]] = {}
			for document in documents:
				for field_name, value in document.items():
					field_types.setdefault(field_name, set()).add(self._type_name(value))

			columns = [
				{
					"column_name": field_name,
					"data_type": ", ".join(sorted(types)),
					"is_nullable": "YES",
				}
				for field_name, types in sorted(field_types.items())
			]
			return {"columns": columns, "document_count_sampled": len(documents)}
		except Exception as error:
			raise ConnectorError(f"MongoDB schema lookup failed for '{table_name}': {error}") from error

	async def fetch_rows(
		self,
		table_name: str,
		limit: int = 1000,
		query_filter: Optional[Dict[str, Any]] = None,
		projection: Optional[Dict[str, Any]] = None,
	) -> List[Dict[str, Any]]:
		if self.database is None:
			await self.connect()
		try:
			rows = await self.database[table_name].find(
				query_filter or {}, projection, limit=limit
			).to_list(length=limit)
			return [self._json_safe(row) for row in rows]
		except Exception as error:
			raise ConnectorError(f"MongoDB row lookup failed for '{table_name}': {error}") from error

	@classmethod
	def _json_safe(cls, value: Any) -> Any:
		if isinstance(value, dict):
			return {key: cls._json_safe(item) for key, item in value.items()}
		if isinstance(value, list):
			return [cls._json_safe(item) for item in value]
		if isinstance(value, float) and not math.isfinite(value):
			return None
		if value.__class__.__name__ in {"ObjectId", "datetime"}:
			return str(value)
		return value

	@staticmethod
	def _type_name(value: Any) -> str:
		if value is None:
			return "null"
		if isinstance(value, bool):
			return "boolean"
		if isinstance(value, int):
			return "integer"
		if isinstance(value, float):
			return "number"
		if isinstance(value, str):
			return "string"
		if isinstance(value, list):
			return "array"
		if isinstance(value, dict):
			return "object"
		return type(value).__name__
