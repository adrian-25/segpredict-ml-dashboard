from fastapi import APIRouter, HTTPException, Depends
from google.oauth2 import id_token
from google.auth.transport import requests
import os
from datetime import timedelta
from auth import create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from database import users_collection
from schemas import GoogleAuthRequest

router = APIRouter(prefix="/auth", tags=["auth"])

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")

@router.post("/google")
async def google_auth(request: GoogleAuthRequest):
    try:
        # Validate the token with Google
        idinfo = id_token.verify_oauth2_token(
            request.token, requests.Request(), GOOGLE_CLIENT_ID
        )
        email = idinfo.get("email")
        name = idinfo.get("name")
        google_id = idinfo.get("sub")
        
        # Check if user exists in DB
        user = await users_collection.find_one({"email": email})
        
        if not user:
            # Create new user
            new_user = {
                "_id": google_id,
                "email": email,
                "name": name,
            }
            await users_collection.insert_one(new_user)
            user_id = google_id
        else:
            user_id = str(user["_id"])
            
        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user_id}, expires_delta=access_token_expires
        )
        
        return {
            "access_token": access_token, 
            "token_type": "bearer",
            "user": {
                "id": user_id,
                "name": name,
                "email": email
            }
        }
        
    except ValueError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
