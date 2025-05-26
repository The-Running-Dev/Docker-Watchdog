# log_config.py

import os
import logging
import pytz
from datetime import datetime

TIME_ZONE = os.getenv("TimeZone", "UTC")

class TZFormatter(logging.Formatter):
    def __init__(self, fmt=None, datefmt=None):
        self.timezone = pytz.timezone(TIME_ZONE)
        super().__init__(fmt=fmt, datefmt=datefmt)

    def formatTime(self, record, datefmt=None):
        dt = datetime.fromtimestamp(record.created, self.timezone)
        
        # Format with timezone offset included
        return dt.strftime("%Y-%m-%d %H:%M:%S %z")

def setup_logger(name: str = __name__) -> logging.Logger:
    handler = logging.StreamHandler()
    formatter = TZFormatter(
        fmt="[%(asctime)s] [%(levelname)s] %(message)s",
    )
    handler.setFormatter(formatter)

    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)
    logger.addHandler(handler)
    logger.propagate = False

    return logger