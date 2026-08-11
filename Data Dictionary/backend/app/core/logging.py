import logging
import os
from typing import Callable

try:
    from loguru import logger  # type: ignore
    def setup_logging():
        # Use loguru configuration when available
        import sys
        logger.remove()
        logger.add(sys.stdout, level="INFO")
        logger.add("backend_logs.log", rotation="10 MB", level="DEBUG")

except Exception:
    # Fallback implementation using stdlib logging
    logger = logging.getLogger("data_dictionary")

    def setup_logging():
        level = os.environ.get("LOG_LEVEL", "INFO").upper()
        numeric_level = getattr(logging, level, logging.INFO)
        handler = logging.StreamHandler()
        formatter = logging.Formatter("%(asctime)s %(levelname)s %(name)s - %(message)s")
        handler.setFormatter(formatter)
        if not logger.handlers:
            logger.addHandler(handler)
        logger.setLevel(numeric_level)
