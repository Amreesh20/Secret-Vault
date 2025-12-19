from fastapi import FastAPI, UploadFile, File, HTTPException, Body, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from app.services.encryption_service import generate_key, encrypt_data, decrypt_data
import os
import json
import io
import shutil
import time
# ... (keep existing imports)
from app.services.drive_service import backup_and_upload
from app.services.email_service import send_recovery_token
from app.api import auth
# ... (existing imports)
from app.api.auth import fake_users_db # <--- IMPORT THE USER DATABASE

# ... (rest of your code)


# Initialize the App
app = FastAPI(title="Secure File Vault API")

# Allow Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)

# --- CONFIGURATION ---
STORAGE_DIR = "storage/live_vaults"
METADATA_FILE = "storage/metadata.json"
os.makedirs(STORAGE_DIR, exist_ok=True)
DESTROY_DIR = "storage/destroyed_vaults"
os.makedirs(DESTROY_DIR, exist_ok=True)

# --- HELPER: Metadata Manager (Persist Ownership) ---
def load_metadata():
    if not os.path.exists(METADATA_FILE):
        return {}
    try:
        with open(METADATA_FILE, "r") as f:
            return json.load(f)
    except:
        return {}

def save_metadata(filename, owner_email):
    data = load_metadata()
    data[filename] = owner_email
    with open(METADATA_FILE, "w") as f:
        json.dump(data, f)

def get_file_owner(filename):
    data = load_metadata()
    return data.get(filename)

# --- ROUTES ---

@app.get("/")
def read_root():
    return {"status": "online", "message": "Secure Vault System is Active 🛡️"}

@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...), 
    password: str = Form(...),      # The Vault Key
    user_email: str = Form(...)     # <--- NEW: Who owns this?
):
    try:
        # 1. Read file
        file_bytes = await file.read()
        
        # 2. Encrypt
        key, salt = generate_key(password)
        encrypted_data, tag, iv = encrypt_data(file_bytes, key)
        
        # 3. Save to Disk
        final_blob = salt + iv + tag + encrypted_data
        
        # We append a timestamp or UUID in production, but simple filename for now
        safe_filename = f"{file.filename}.enc" 
        file_path = os.path.join(STORAGE_DIR, safe_filename)
        
        with open(file_path, "wb") as f:
            f.write(final_blob)

        # 4. Save Ownership Metadata
        save_metadata(safe_filename, user_email)
            
        return {
            "filename": safe_filename,
            "owner": user_email,
            "status": "encrypted"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/files")
def list_files(user_email: str = Query(...)): # <--- NEW: Require email to list
    files = []
    metadata = load_metadata()

    if os.path.exists(STORAGE_DIR):
        for filename in os.listdir(STORAGE_DIR):
            if filename.endswith(".enc"):
                # SECURITY CHECK: Does this file belong to the user?
                if metadata.get(filename) == user_email:
                    stats = os.stat(os.path.join(STORAGE_DIR, filename))
                    files.append({
                        "name": filename, 
                        "size": stats.st_size,
                        "created": stats.st_ctime
                    })
    return files

@app.post("/download")
async def download_file(
    filename: str = Body(...), 
    private_key: str = Body(...),
    user_email: str = Body(...) # <--- NEW: Verify identity
):
    file_path = os.path.join(STORAGE_DIR, filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    # SECURITY CHECK: Ownership
    owner = get_file_owner(filename)
    if owner != user_email:
        raise HTTPException(status_code=403, detail="ACCESS DENIED: You do not own this file.")

    # 1. Read Encrypted File
    try:
        with open(file_path, "rb") as f:
            file_content = f.read()
    except Exception:
        raise HTTPException(status_code=500, detail="Could not read file.")

    # 2. Extract Components
    try:
        salt = file_content[:16]
        iv = file_content[16:32]
        tag = file_content[32:48]
        ciphertext = file_content[48:]
    except IndexError:
        raise HTTPException(status_code=400, detail="File corrupted.")

    # 3. Decrypt
    try:
        clean_key = private_key.strip()
        key, _ = generate_key(clean_key, salt)
        decrypted_data = decrypt_data(ciphertext, tag, iv, key)

        if decrypted_data is None:
            raise ValueError("Decryption returned None")
    except Exception:
        raise HTTPException(status_code=400, detail="Decryption Failed (Wrong Key).")

    # 4. Stream File
    original_name = filename.replace(".enc", "")
    return StreamingResponse(
        io.BytesIO(decrypted_data), 
        media_type="application/octet-stream",
        headers={"Content-Disposition": f"attachment; filename={original_name}"}
    )
@app.post("/destroy-vault")
def destroy_vault(
    user_email: str = Body(...),
    private_key: str = Body(...) 
):
    """
    EMERGENCY PROTOCOL:
    1. Identifies all files owned by the user.
    2. Moves them to a 'Destroyed' quarantine folder.
    3. Revokes access (removes from metadata).
    4. Generates a textual Recovery Token.
    """
    metadata = load_metadata()
    files_moved = 0
    
    # Generate a specialized "Recovery Token" (Simulated)
    # In a real app, this would be the ONLY key capable of decrypting the quarantined files.
    recovery_token = f"REC-{int(time.time())}-{auth.hash_key(private_key)[:8].upper()}"

    # Iterate through all files to find the user's data
    # We use list(metadata.keys()) to avoid error while modifying the dictionary
    for filename in list(metadata.keys()):
        if metadata[filename] == user_email:
            source_path = os.path.join(STORAGE_DIR, filename)
            
            if os.path.exists(source_path):
                # Move to Destroyed Folder with a timestamp prefix
                dest_filename = f"DESTROYED_{int(time.time())}_{filename}"
                dest_path = os.path.join(DESTROY_DIR, dest_filename)
                
                shutil.move(source_path, dest_path)
                files_moved += 1
            
            # Remove from Active Metadata (User can no longer see/access it)
            del metadata[filename]

    # Save the updated metadata (cleaning the ledger)
    with open(METADATA_FILE, "w") as f:
        json.dump(metadata, f)
    
    try:
        print("DEBUG: Creating backup ZIP...")
        zip_path = shutil.make_archive(f"VAULT_BACKUP_{user_email}", 'zip', DESTROY_DIR)
        
        # Import the new function
        from app.services.email_service import send_backup_email
        send_backup_email(user_email, recovery_token, zip_path)
        
        # Cleanup: Delete local ZIP after sending
        os.remove(zip_path)
        
    except Exception as e:
        print(f"Backup Email Failed: {e}")
    # -------------------------------------
     # --- NEW: Delete User Record ---
    if user_email in fake_users_db:
        del fake_users_db[user_email]
        print(f"✅ User record for {user_email} has been wiped.")
    # -----------------------------


    return {
        "status": "VAULT DESTROYED",
        "files_affected": files_moved,
        "message": "Your vault has been locked and files moved to deep storage.",
        "recovery_token": recovery_token
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
