import pyodbc
from app.connectors.base import BaseConnector
from app.core.errors import ConnectorError


class SQLServerConnector(BaseConnector):
    def __init__(self, conn_str: str):
        self.conn_str = conn_str
        self.conn = None

    async def connect(self):
        try:
            self.conn = pyodbc.connect(self.conn_str)
        except Exception as e:
            raise ConnectorError(str(e))

    async def get_tables(self):
        cur = self.conn.cursor()
        cur.execute(
            "SELECT TABLE_SCHEMA, TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE'"
        )
        rows = cur.fetchall()
        return [dict(zip([c[0] for c in cur.description], r)) for r in rows]

    async def get_table_schema(self, table_name: str):
        cur = self.conn.cursor()
        cur.execute(
            "SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME=?",
            table_name,
        )
        rows = cur.fetchall()
        return {
            "columns": [dict(zip([c[0] for c in cur.description], r)) for r in rows]
        }
