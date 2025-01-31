from dataclasses import dataclass
from enum import Enum


class FileStatus(Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    FAILED = "failed"

@dataclass
class ParseableFile:
    bucketName: str
    fileName: str
    filePath: str
    originalName: str
    contentType: str
    size: int
    status: FileStatus
    parsingTaskId: str

    def to_dict(self):
        return {
            "bucketName": self.bucketName,
            "fileName": self.fileName,
            "filePath": self.filePath,
            "originalName": self.originalName,
            "contentType": self.contentType,
            "size": self.size,
            "status": self.status.value,
            "parsingTaskId": self.parsingTaskId,
        }

