import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")

client = AsyncIOMotorClient(MONGODB_URI)
db = client.SegPredict

# Collections
users_collection = db.get_collection("users")
customers_collection = db.get_collection("customers")
metrics_collection = db.get_collection("user_metrics")
