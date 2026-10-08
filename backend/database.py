"""MongoDB collections with an in-memory fallback for the public demo."""

import copy
import os
from types import SimpleNamespace

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
DEMO_MODE = os.getenv("DEMO_MODE", "").lower() == "true"


class MemoryCursor:
    def __init__(self, documents):
        self._documents = iter(documents)

    def __aiter__(self):
        return self

    async def __anext__(self):
        try:
            return next(self._documents)
        except StopIteration as error:
            raise StopAsyncIteration from error


class MemoryCollection:
    def __init__(self):
        self._documents = []

    @staticmethod
    def _matches(document, query):
        return all(document.get(key) == value for key, value in query.items())

    @staticmethod
    def _project(document, projection):
        if not projection:
            return document
        return {key: value for key, value in document.items() if projection.get(key, 1)}

    async def find_one(self, query, projection=None):
        for document in self._documents:
            if self._matches(document, query):
                return self._project(copy.deepcopy(document), projection)
        return None

    async def insert_one(self, document):
        self._documents.append(copy.deepcopy(document))
        return SimpleNamespace(inserted_id=document.get("_id"))

    async def update_one(self, query, update, upsert=False):
        for document in self._documents:
            if self._matches(document, query):
                document.update(copy.deepcopy(update.get("$set", {})))
                return SimpleNamespace(matched_count=1, modified_count=1)
        if upsert:
            document = {**query, **copy.deepcopy(update.get("$set", {}))}
            self._documents.append(document)
            return SimpleNamespace(matched_count=0, modified_count=0, upserted_id=document.get("_id"))
        return SimpleNamespace(matched_count=0, modified_count=0)

    def find(self, query):
        documents = [copy.deepcopy(doc) for doc in self._documents if self._matches(doc, query)]
        return MemoryCursor(documents)


if DEMO_MODE or not MONGODB_URI:
    # Data survives only for the current service instance. This lets the public
    # demo run without collecting visitor data or requiring database credentials.
    users_collection = MemoryCollection()
    customers_collection = MemoryCollection()
    metrics_collection = MemoryCollection()
else:
    client = AsyncIOMotorClient(MONGODB_URI)
    db = client.SegPredict
    users_collection = db.get_collection("users")
    customers_collection = db.get_collection("customers")
    metrics_collection = db.get_collection("user_metrics")
