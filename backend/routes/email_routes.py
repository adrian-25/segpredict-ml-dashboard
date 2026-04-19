from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from auth import get_current_user, create_access_token, SECRET_KEY, ALGORITHM
from jose import jwt, JWTError
from database import customers_collection
from email_service import send_approval_email
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

router = APIRouter(tags=["email"])

class EmailRequest(BaseModel):
    customer_id: str

@router.post("/send-email")
async def send_customer_email(req: EmailRequest, request: Request, background_tasks: BackgroundTasks, user_id: str = Depends(get_current_user)):
    customer = await customers_collection.find_one({"_id": req.customer_id, "user_id": user_id})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found.")
        
    # Generate an approval token specific to this customer
    token = create_access_token(data={"customer_id": req.customer_id, "action": "approve"})
    
    # Generate the action URL (assumes the server is running on the host that request comes from)
    # E.g., http://localhost:8000/email/approve?token=xxxxx
    base_url = str(request.base_url)
    approval_link = f"{base_url}email/approve?token={token}"
    
    # Send email in background to prevent blocking
    background_tasks.add_task(send_approval_email, customer["email"], customer["name"], approval_link)
    
    # Update status immediately to "Sent"
    await customers_collection.update_one(
        {"_id": req.customer_id},
        {"$set": {"email_status": "Sent"}}
    )
    
    return {"message": "Email sending initiated", "status": "Sent"}

@router.get("/email/approve")
async def approve_email(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        customer_id = payload.get("customer_id")
        action = payload.get("action")
        
        if not customer_id or action != "approve":
             raise HTTPException(status_code=400, detail="Invalid token payload")
             
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
        
    # Update customer in DB
    result = await customers_collection.update_one(
        {"_id": customer_id},
        {"$set": {"email_status": "Approved"}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Customer no longer exists")
        
    # Return HTML success page
    html_content = """
    <html>
        <head>
            <title>Offer Approved</title>
            <style>
                body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #f3f4f6; margin: 0; }
                .card { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; }
                .success { color: #10b981; font-size: 48px; margin-bottom: 20px; }
            </style>
        </head>
        <body>
            <div class="card">
                <div class="success">✓</div>
                <h2>Offer Approved Successfully!</h2>
                <p>Thank you for your response. We will be in touch shortly.</p>
            </div>
        </body>
    </html>
    """
    return HTMLResponse(content=html_content)
