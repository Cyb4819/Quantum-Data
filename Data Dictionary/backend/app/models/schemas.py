from pydantic import BaseModel, Field, validator
from typing import Any, Dict, List, Optional


class ColumnInfo(BaseModel):
    column_name: str
    data_type: Optional[str]
    is_nullable: Optional[str]


class TableSchema(BaseModel):
    table_name: str
    columns: List[ColumnInfo]


class ExtractResponse(BaseModel):
    status: str
    data: Dict[str, Any]


class QualityResponse(BaseModel):
    status: str
    table: str
    metrics: Dict[str, Any]


class DatabaseConnectionRequest(BaseModel):
    db_type: str = Field(
        ..., description="Database type: postgresql, mysql, snowflake, sqlserver"
    )
    host: Optional[str] = None
    port: Optional[int] = None
    user: Optional[str] = None
    password: Optional[str] = None
    database: Optional[str] = None

    @validator("db_type")
    def validate_db_type(cls, v):
        allowed = ["postgresql", "mysql", "snowflake", "sqlserver"]
        if v.lower() not in allowed:
            raise ValueError(f"db_type must be one of {allowed}")
        return v.lower()


class TableQueryRequest(BaseModel):
    table_name: str = Field(..., min_length=1, max_length=255)
    limit: int = Field(default=1000, ge=1, le=10000)

    @validator("table_name")
    def sanitize_table_name(cls, v):
        if not v.replace("_", "").replace("-", "").isalnum():
            raise ValueError("table_name contains invalid characters")
        return v


class SummarizeRequest(BaseModel):
    schema: dict = Field(..., description="Table schema metadata")
    max_tokens: int = Field(default=500, ge=100, le=2000)
