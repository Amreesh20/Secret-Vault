from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
import shutil
import os
import zipfile

SCOPES = ['https://www.googleapis.com/auth/drive.file']
SERVICE_ACCOUNT_FILE = 'service_account.json'
PARENT_FOLDER_ID = '1hvWVUzk24IRFMg6YHPxNwXJItdeZJLJ_' # Get from URL of your Drive folder

def backup_and_upload(user_email, recovery_token):
    # 1. Zip the Destroyed Vault
    source_dir = "storage/destroyed_vaults"
    
    # shutil.make_archive automatically adds .zip to this name
    base_name = f"VAULT_BACKUP_{user_email}"
    
    # This creates "VAULT_BACKUP_email.zip" in the current directory
    zip_path = shutil.make_archive(base_name, 'zip', source_dir)
    
    print(f"DEBUG: Zip created at {zip_path}")
    
    # 2. Authenticate Google Drive
    creds = service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE, scopes=SCOPES)
    service = build('drive', 'v3', credentials=creds)

    # 3. Upload
    file_metadata = {
        'name': f"{base_name}.zip", # Name shown in Google Drive
        'parents': [PARENT_FOLDER_ID]
    }
    
    # We use the path returned by make_archive to be safe
    media = MediaFileUpload(zip_path, mimetype='application/zip')

    file = service.files().create(
        body=file_metadata, 
        media_body=media, 
        fields='id',
        supportsAllDrives=True  # <--- CRITICAL FIX
    ).execute()

    
    # Cleanup: Delete the local zip file after upload to save space
    try:
        os.remove(zip_path)
    except:
        pass
    
    print(f"Backup ID: {file.get('id')}")
    return file.get('id')
