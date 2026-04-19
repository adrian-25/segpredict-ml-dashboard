import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from dotenv import load_dotenv

load_dotenv()

EMAIL_USER = os.getenv("EMAIL_USER")
APP_PASS = os.getenv("APP_PASS")

def send_approval_email(to_email: str, customer_name: str, approval_link: str):
    if not EMAIL_USER or not APP_PASS:
        print("Email credentials are not set up!")
        return False
        
    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Special Offer for You!"
    msg["From"] = EMAIL_USER
    msg["To"] = to_email
    
    text = f"Hi {customer_name},\n\We have an exclusive offer for you! Approve it here: {approval_link}"
    html = f"""\
    <html>
      <body>
        <p>Hi <b>{customer_name}</b>,</p>
        <p>We've prepared an exclusive offer to thank you for your loyalty!</p>
        <a href="{approval_link}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Approve Offer</a>
      </body>
    </html>
    """
    
    part1 = MIMEText(text, "plain")
    part2 = MIMEText(html, "html")
    
    msg.attach(part1)
    msg.attach(part2)
    
    try:
        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(EMAIL_USER, APP_PASS)
        server.sendmail(EMAIL_USER, to_email, msg.as_string())
        server.quit()
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False
