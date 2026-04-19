import os
from dotenv import load_dotenv
from google_auth_oauthlib.flow import Flow

# Load environment variables
load_dotenv()

# Config
CLIENT_SECRET_FILE = os.getenv("GOOGLE_CLIENT_SECRET_PATH", "secrets/client_secret.json")
SCOPES = ["https://www.googleapis.com/auth/gmail.send"]
REDIRECT_URI = "http://localhost:8080"

def main():
    try:
        # Initialize OAuth flow
        flow = Flow.from_client_secrets_file(
            CLIENT_SECRET_FILE,
            scopes=SCOPES,
            redirect_uri=REDIRECT_URI
        )

        # Generate auth URL
        auth_url, _ = flow.authorization_url(
            access_type='offline',   # required for refresh token
            prompt='consent'         # forces refresh token
        )

        print("\n👉 Open this URL in your browser:\n")
        print(auth_url)

        # Get authorization code from user
        code = input("\n📥 Paste the authorization code here: ").strip()

        if not code:
            print("❌ No code provided. Exiting.")
            return

        # Exchange code for tokens
        flow.fetch_token(code=code)
        credentials = flow.credentials

        print("\n✅ ACCESS TOKEN:\n", credentials.token)

        if credentials.refresh_token:
            print("\n🎉 REFRESH TOKEN:\n", credentials.refresh_token)
        else:
            print("\n⚠️ No refresh token received.")
            print("👉 Try this:")
            print("   1. Revoke app access: https://myaccount.google.com/permissions")
            print("   2. Use incognito window")
            print("   3. Ensure prompt='consent' is set")

    except FileNotFoundError:
        print(f"❌ Client secret file not found at: {CLIENT_SECRET_FILE}")
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    main()