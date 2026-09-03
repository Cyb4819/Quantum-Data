from fastapi import APIRouter, HTTPException
from app.extractors.schema_extractor import SchemaExtractor
from app.core.errors import ConnectorError, ExtractionError
from app.config import settings
from app.models.schemas import DatabaseConnectionRequest, ExtractResponse
from app.api.middleware import limiter
from app.core.logging import logger

router = APIRouter()


@router.get("/all", response_model=ExtractResponse)
@limiter.limit(f"{settings.RATE_LIMIT_UNAUTHENTICATED}/minute")
async def extract_all(request):
    try:
        logger.info("Schema extraction started (PostgreSQL)")
        from app.connectors.postgresql import PostgresConnector

        dsn = settings.DATABASE_URL
        connector = PostgresConnector(dsn=dsn)
        await connector.connect()
        extractor = SchemaExtractor(connector)
        result = await extractor.extract_all()
        logger.info(f"Schema extraction completed: {len(result)} tables")
        return {"status": "ok", "data": result}
    except ConnectorError as e:
        logger.error(f"Connector error during extraction: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Database connection failed: {str(e)}"
        )
    except ExtractionError as e:
        logger.error(f"Extraction error: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Schema extraction failed: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Unexpected error during extraction: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/connect", response_model=ExtractResponse)
@limiter.limit(f"{settings.RATE_LIMIT_UNAUTHENTICATED}/minute")
async def extract_with_connection(request, conn_req: DatabaseConnectionRequest):
    try:
        logger.info(f"Schema extraction started ({conn_req.db_type})")

        if conn_req.db_type == "postgresql":
            from app.connectors.postgresql import PostgresConnector

            connector = PostgresConnector(dsn=conn_req.database)
        elif conn_req.db_type == "mysql":
            from app.connectors.mysql import MySQLConnector

            connector = MySQLConnector(
                host=conn_req.host,
                port=conn_req.port,
                user=conn_req.user,
                password=conn_req.password,
                database=conn_req.database,
            )
        else:
            raise ValueError(f"Unsupported database type: {conn_req.db_type}")

        await connector.connect()
        extractor = SchemaExtractor(connector)
        result = await extractor.extract_all()
        logger.info(f"Schema extraction completed: {len(result)} tables")
        return {"status": "ok", "data": result}
    except ConnectorError as e:
        logger.error(f"Connector error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"Error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")
