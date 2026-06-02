import logging
import sys


def setup_logging():
    """Level 3a: Foundation - Standard System-wide Logging."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[logging.StreamHandler(sys.stderr)],
    )
    logger = logging.getLogger("agentic-testing")
    logger.info("Foundation level logging initialized.")
    return logger
