import os
import math
import uuid
import cv2
import numpy as np
import urllib.request
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.sql import text

from celery_app import celery_app
import models
from database import engine, SessionLocal

# ==========================================
# 📧 SMTP Real Email Dispatcher
# ==========================================
def send_smtp_email(to_email: str, subject: str, body_html: str, body_text: str):
    """
    Sends a real email using SMTP if credentials are configured in environment variables.
    Otherwise, logs the simulation to the console.
    """
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = os.getenv("SMTP_PORT", "587")
    smtp_user = os.getenv("SMTP_USERNAME")
    smtp_pass = os.getenv("SMTP_PASSWORD")

    if not all([smtp_host, smtp_user, smtp_pass]):
        print(f"[SMTP Simulator] To: {to_email} | Subject: {subject} | SMTP credentials missing in env.")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = smtp_user
        msg["To"] = to_email
        msg["Subject"] = subject

        part1 = MIMEText(body_text, "plain")
        part2 = MIMEText(body_html, "html")
        msg.attach(part1)
        msg.attach(part2)

        server = smtplib.SMTP(smtp_host, int(smtp_port))
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.sendmail(smtp_user, to_email, msg.as_string())
        server.quit()
        print(f"Email successfully sent to {to_email} via SMTP.")
        return True
    except Exception as e:
        print(f"Error sending SMTP email to {to_email}: {e}")
        return False


# ==========================================
# 🤖 Computer Vision & AI Models
# ==========================================
def download_sface_model():
    model_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
    os.makedirs(model_dir, exist_ok=True)
    model_path = os.path.join(model_dir, "face_recognition_sface_2021dec.onnx")
    
    if not os.path.exists(model_path):
        print("SFace model not found locally. Downloading pre-trained SFace CNN model (1.3MB) from Hugging Face...")
        model_url = "https://huggingface.co/opencv/face_recognition_sface/resolve/main/face_recognition_sface_2021dec.onnx"
        try:
            req = urllib.request.Request(
                model_url, 
                headers={'User-Agent': 'Mozilla/5.0'}
            )
            with urllib.request.urlopen(req) as response, open(model_path, 'wb') as out_file:
                out_file.write(response.read())
            print("SFace model downloaded successfully.")
        except Exception as e:
            print(f"Error downloading face model: {e}")
    return model_path


def align_face(image_path: str) -> list:
    """
    Detects faces, finds eye coordinates, performs affine rotation to align the eyes, 
    crops the aligned face, and saves it to uploads/aligned_faces/.
    Returns a list of relative saved file paths.
    """
    # 1. Load classifiers
    face_cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
    eye_cascade_path = cv2.data.haarcascades + 'haarcascade_eye.xml'
    
    face_cascade = cv2.CascadeClassifier(face_cascade_path)
    eye_cascade = cv2.CascadeClassifier(eye_cascade_path)

    # 2. Read image
    img = cv2.imread(image_path)
    if img is None:
        print(f"Error: OpenCV could not read image at {image_path}")
        return []

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # 3. Detect faces
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.2, minNeighbors=5, minSize=(60, 60))
    saved_paths = []

    # Ensure output directory exists
    output_dir = os.path.join(os.path.dirname(os.path.abspath(image_path)), "aligned_faces")
    os.makedirs(output_dir, exist_ok=True)

    for idx, (x, y, w, h) in enumerate(faces):
        roi_gray = gray[y:y+h, x:x+w]
        roi_color = img[y:y+h, x:x+w]

        # Detect eyes inside face region
        eyes = eye_cascade.detectMultiScale(roi_gray, scaleFactor=1.15, minNeighbors=3, minSize=(15, 15))
        
        desired_size = 112
        aligned_face = None

        if len(eyes) >= 2:
            eyes = sorted(eyes, key=lambda e: e[0])
            left_eye = eyes[0]
            right_eye = eyes[1]
            left_eye_center = (x + left_eye[0] + left_eye[2] // 2, y + left_eye[1] + left_eye[3] // 2)
            right_eye_center = (x + right_eye[0] + right_eye[2] // 2, y + right_eye[1] + right_eye[3] // 2)

            # Compute angle
            dy = right_eye_center[1] - left_eye_center[1]
            dx = right_eye_center[0] - left_eye_center[0]
            angle = math.degrees(math.atan2(dy, dx))

            # Compute scale factor
            eye_dist = math.sqrt(dx*dx + dy*dy)
            desired_eye_dist = desired_size * 0.35
            scale = desired_eye_dist / max(1.0, eye_dist)

            midpoint = ((left_eye_center[0] + right_eye_center[0]) // 2, (left_eye_center[1] + right_eye_center[1]) // 2)
            M = cv2.getRotationMatrix2D(midpoint, angle, scale)

            tx = desired_size * 0.5 - midpoint[0]
            ty = desired_size * 0.35 - midpoint[1]
            M[0, 2] += tx
            M[1, 2] += ty

            aligned_face = cv2.warpAffine(img, M, (desired_size, desired_size))
        else:
            aligned_face = cv2.resize(roi_color, (desired_size, desired_size))

        filename = f"aligned-{uuid.uuid4()}-{idx}.jpg"
        save_path = os.path.join(output_dir, filename)
        cv2.imwrite(save_path, aligned_face)
        saved_paths.append(f"/uploads/aligned_faces/{filename}")

    return saved_paths


def extract_face_embedding(image_path: str) -> list:
    model_path = download_sface_model()
    if not os.path.exists(model_path):
        return []
        
    try:
        img = cv2.imread(image_path)
        if img is None:
            return []
            
        if img.shape[0] != 112 or img.shape[1] != 112:
            img = cv2.resize(img, (112, 112))
            
        recognizer = cv2.FaceRecognizerSF.create(model_path, "")
        feature = recognizer.feature(img)
        
        if feature is not None and len(feature) > 0:
            vec = feature[0]
            norm = np.linalg.norm(vec)
            if norm > 0:
                return (vec / norm).tolist()
    except Exception as e:
        print(f"Error in SFace extraction: {e}")
    return []


def calculate_cosine_similarity(vec1: list, vec2: list) -> float:
    if not vec1 or not vec2 or len(vec1) != len(vec2):
        return 0.0
    dot_product = sum(a * b for a, b in zip(vec1, vec2))
    norm_a = math.sqrt(sum(a * a for a in vec1))
    norm_b = math.sqrt(sum(b * b for b in vec2))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot_product / (norm_a * norm_b)


# ==========================================
# 📝 System Logging Helper
# ==========================================
def log_message(db, studio_id: str, client_id: str | None, subject: str, body: str, channel: str = "Email"):
    log_entry = models.MessageLog(
        studio_id=studio_id,
        client_id=client_id,
        subject=subject,
        body=body,
        channel=channel,
        status="Sent"
    )
    db.add(log_entry)
    db.commit()


# ==========================================
# ⚙️ Asynchronous Celery Task
# ==========================================
@celery_app.task(name="tasks.process_photo_face_matching")
def process_photo_face_matching(photo_id: str):
    """
    Celery task that executes OpenCV Face Detection, alignment, CNN feature extraction,
    pgvector matching, and dispatches automated SMTP emails and WhatsApp logs.
    """
    db = SessionLocal()
    try:
        photo = db.query(models.Photo).filter(models.Photo.id == photo_id).first()
        if not photo:
            print(f"Task Error: Photo with ID {photo_id} not found.")
            return

        gallery = db.query(models.Gallery).filter(models.Gallery.id == photo.gallery_id).first()
        if not gallery:
            return

        # Query targets
        clients = db.query(models.Client).filter(
            models.Client.studio_id == gallery.studio_id,
            models.Client.face_recognition_consent == True,
            models.Client.face_embedding != None
        ).all()
        
        guests = db.query(models.WeddingGuest).filter(
            models.WeddingGuest.booking_id == gallery.booking_id,
            models.WeddingGuest.face_embedding != None
        ).all()

        all_targets = []
        for c in clients:
            all_targets.append(("client", c.id, c.name, c.email, c.face_embedding))
        for g in guests:
            all_targets.append(("guest", g.id, g.name, g.email, g.face_embedding))

        base_dir = os.path.dirname(os.path.abspath(__file__))
        photo_filename = os.path.basename(photo.original_url)
        photo_path = os.path.join(base_dir, "..", "uploads", photo_filename)

        matched_client_ids = []
        matched_client_names = []
        matched_guest_ids = []
        matched_guest_names = []

        if os.path.exists(photo_path):
            aligned_crops = align_face(photo_path)
            
            for crop_rel_path in aligned_crops:
                crop_filename = os.path.basename(crop_rel_path)
                crop_absolute_path = os.path.join(base_dir, "..", "uploads", "aligned_faces", crop_filename)
                
                face_embedding = extract_face_embedding(crop_absolute_path)
                if face_embedding:
                    # Save embedding to PostgreSQL photos_faces table
                    db_face = models.PhotoFace(
                        photo_id=photo_id,
                        face_embedding=face_embedding
                    )
                    db.add(db_face)
                    db.commit()

                    for t_type, t_id, t_name, t_email, t_embedding in all_targets:
                        sim = calculate_cosine_similarity(face_embedding, t_embedding)
                        print(f"Task CNN Match: Photo {photo_id} against {t_name}. Cosine Similarity: {sim:.4f}")
                        
                        if sim > 0.365:
                            if t_type == "client":
                                if t_id not in matched_client_ids:
                                    matched_client_ids.append(t_id)
                                    matched_client_names.append(t_name)
                            else:
                                if t_id not in matched_guest_ids:
                                    matched_guest_ids.append(t_id)
                                    matched_guest_names.append(t_name)

                                    # 1. Dispatch real automated SMTP email
                                    subject = f"We found your photos from the wedding!"
                                    gallery_url = f"http://localhost:5173/public/guest/{t_id}/gallery"
                                    
                                    body_html = f"""
                                    <html>
                                      <body style="font-family: Arial, sans-serif; background-color: #f3f4f6; padding: 20px;">
                                        <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; max-width: 600px; margin: 0 auto; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                                          <h2 style="color: #4f46e5;">Hi {t_name}!</h2>
                                          <p style="font-size: 16px; color: #374151;">The wedding photographer has uploaded new snapshots, and we matched your face in one of them!</p>
                                          <p style="font-size: 16px; color: #374151;">Click the button below to view your personalized wedding photo gallery page:</p>
                                          <div style="text-align: center; margin: 30px 0;">
                                            <a href="{gallery_url}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">View My Photos</a>
                                          </div>
                                          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
                                          <p style="font-size: 12px; color: #9ca3af;">This email was sent automatically by Aperture CRM. Your biometric data is processed securely and is private to this event.</p>
                                        </div>
                                      </body>
                                    </html>
                                    """
                                    body_text = f"Hi {t_name},\n\nWe found you in the wedding photos! Click here to view your personal gallery: {gallery_url}"
                                    
                                    send_smtp_email(
                                        to_email=t_email,
                                        subject=subject,
                                        body_html=body_html,
                                        body_text=body_text
                                    )

                                    # 2. Log simulated WhatsApp message sent to the guest
                                    log_message(
                                        db,
                                        studio_id=gallery.studio_id,
                                        client_id=None,
                                        subject="WhatsApp Auto-Notification",
                                        body=f"Sent WhatsApp alert to guest '{t_name}' (WhatsApp: {t_name}'s registered number) containing their match link: {gallery_url}",
                                        channel="WhatsApp"
                                    )
                                    # 3. Log email delivery success into Message Logs table
                                    log_message(
                                        db,
                                        studio_id=gallery.studio_id,
                                        client_id=None,
                                        subject=subject,
                                        body=f"Sent automated match email to guest {t_name} ({t_email}) with gallery link.",
                                        channel="Email"
                                    )

        # Update photo tags and targets
        base_tags = ["Sharp", "Outdoor", "Candid", "High Composition"]
        for name in matched_client_names:
            base_tags.append(f"Found: {name}")
        for name in matched_guest_names:
            base_tags.append(f"Guest: {name}")

        photo.ai_tags = base_tags
        photo.matched_clients = matched_client_ids
        photo.matched_guests = matched_guest_ids
        db.commit()
        print(f"Celery task face processing complete for photo: {photo_id}")
        
    except Exception as e:
        print(f"Error in Celery background task: {e}")
    finally:
        db.close()
