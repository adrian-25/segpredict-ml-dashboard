"""MongoDB collections with an in-memory fallback for the public demo."""

import copy
import os
from types import SimpleNamespace

from dotenv import load_dotenv
import httpx
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
DEMO_MODE = os.getenv("DEMO_MODE", "").lower() == "true"
SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


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


class SupabaseCollection:
    """Minimal async adapter for the PostgREST API used by the existing routes."""

    def __init__(self, table, conflict_column="_id"):
        self._table_url = f"{SUPABASE_URL}/rest/v1/{table}"
        self._conflict_column = conflict_column

    @staticmethod
    def _project(document, projection):
        return MemoryCollection._project(document, projection)

    @staticmethod
    def _filters(query):
        return {key: f"eq.{value}" for key, value in query.items()}

    @staticmethod
    def _headers(prefer="return=representation"):
        return {
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
            "Content-Type": "application/json",
            "Prefer": prefer,
        }

    async def _request(self, method, *, params=None, json=None, prefer="return=representation"):
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.request(
                method,
                self._table_url,
                params=params,
                json=json,
                headers=self._headers(prefer),
            )
        response.raise_for_status()
        return response.json() if response.content else []

    async def find_one(self, query, projection=None):
        rows = await self._request("GET", params={**self._filters(query), "limit": 1})
        return self._project(rows[0], projection) if rows else None

    async def insert_one(self, document):
        rows = await self._request("POST", json=document)
        inserted = rows[0] if rows else document
        return SimpleNamespace(inserted_id=inserted.get("_id"))

    async def update_one(self, query, update, upsert=False):
        fields = update.get("$set", {})
        if upsert:
            document = {**query, **fields}
            rows = await self._request(
                "POST",
                params={"on_conflict": self._conflict_column},
                json=document,
                prefer="resolution=merge-duplicates,return=representation",
            )
            return SimpleNamespace(matched_count=0, modified_count=1, upserted_id=(rows[0] if rows else document).get("_id"))
        rows = await self._request("PATCH", params=self._filters(query), json=fields)
        return SimpleNamespace(matched_count=len(rows), modified_count=len(rows))

    def find(self, query):
        async def load_documents():
            return await self._request("GET", params=self._filters(query))

        return DeferredCursor(load_documents)


class DeferredCursor:
    def __init__(self, loader):
        self._loader = loader
        self._iterator = None

    def __aiter__(self):
        return self

    async def __anext__(self):
        if self._iterator is None:
            self._iterator = iter(await self._loader())
        try:
            return next(self._iterator)
        except StopIteration as error:
            raise StopAsyncIteration from error


if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
    users_collection = SupabaseCollection("users")
    customers_collection = SupabaseCollection("customers")
    metrics_collection = SupabaseCollection("user_metrics", conflict_column="user_id")
elif DEMO_MODE or not MONGODB_URI:
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
