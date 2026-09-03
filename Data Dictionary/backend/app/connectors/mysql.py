import aiomysql
from app.connectors.base import BaseConnector
from app.core.errors import ConnectorError
from app.config import settings


class MySQLConnector(BaseConnector):
    def __init__(self, host=None, user=None, password=None, database=None, port=3306):
        self.host = host or settings.MYSQL_HOST or "localhost"
        self.user = user or settings.MYSQL_USER or "root"
        self.password = password or settings.MYSQL_PASSWORD or ""
        self.database = database or settings.MYSQL_DB or "information_schema"
        self.port = port or settings.MYSQL_PORT or 3306
        self.pool = None

    async def connect(self):
        try:
            self.pool = await aiomysql.create_pool(
                host=self.host,
                port=self.port,
                user=self.user,
                password=self.password,
                db=self.database,
                minsize=5,
                maxsize=10,
                connect_timeout=5,
            )
        except Exception as e:
            raise ConnectorError(f"MySQL connection failed: {str(e)}")

    async def get_tables(self):
        if not self.pool:
            await self.connect()
        async with self.pool.acquire() as conn:
            async with conn.cursor(aiomysql.DictCursor) as cur:
                await cur.execute("""
                    SELECT TABLE_SCHEMA, TABLE_NAME
                    FROM INFORMATION_SCHEMA.TABLES
                    WHERE TABLE_SCHEMA NOT IN ('information_schema', 'mysql', 'performance_schema')
                """)
                return await cur.fetchall()

    async def get_table_schema(self, table_name: str):
        if not self.pool:
            await self.connect()
        async with self.pool.acquire() as conn:
            async with conn.cursor(aiomysql.DictCursor) as cur:
                await cur.execute(
                    f"""
                    SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_NAME = %s
                """,
                    (table_name,),
                )
                cols = await cur.fetchall()
                return {"columns": cols if cols else []}

    async def fetch_rows(self, table_name: str, limit: int = 1000):
        if not self.pool:
            await self.connect()
        async with self.pool.acquire() as conn:
            async with conn.cursor(aiomysql.DictCursor) as cur:
                await cur.execute(f"SELECT * FROM {table_name} LIMIT %s", (limit,))
                return await cur.fetchall()
