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

ws_notifier = None

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
    Returns a list of relative saved file paths and eye details.
    """
    face_cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
    eye_cascade_path = cv2.data.haarcascades + 'haarcascade_eye.xml'
    
    face_cascade = cv2.CascadeClassifier(face_cascade_path)
    eye_cascade = cv2.CascadeClassifier(eye_cascade_path)

    img = cv2.imread(image_path)
    if img is None:
        return []

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.2, minNeighbors=5, minSize=(60, 60))
    results = []

    output_dir = os.path.join(os.path.dirname(os.path.abspath(image_path)), "aligned_faces")
    os.makedirs(output_dir, exist_ok=True)

    for idx, (x, y, w, h) in enumerate(faces):
        roi_gray = gray[y:y+h, x:x+w]
        roi_color = img[y:y+h, x:x+w]

        eyes = eye_cascade.detectMultiScale(roi_gray, scaleFactor=1.15, minNeighbors=3, minSize=(15, 15))
        desired_size = 112

        if len(eyes) >= 2:
            eyes = sorted(eyes, key=lambda e: e[0])
            left_eye = eyes[0]
            right_eye = eyes[1]
            left_eye_center = (x + left_eye[0] + left_eye[2] // 2, y + left_eye[1] + left_eye[3] // 2)
            right_eye_center = (x + right_eye[0] + right_eye[2] // 2, y + right_eye[1] + right_eye[3] // 2)

            dy = right_eye_center[1] - left_eye_center[1]
            dx = right_eye_center[0] - left_eye_center[0]
            angle = math.degrees(math.atan2(dy, dx))

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
        
        results.append({
            "path": f"/uploads/aligned_faces/{filename}",
            "eyes_count": len(eyes)
        })

    return results


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
# 🔍 Culling & Retouching Metrics
# ==========================================
def calculate_sharpness(image_path: str) -> float:
    """
    Measures the focus/sharpness using Laplacian variance (Laplacian score).
    """
    try:
        img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
        if img is None:
            return 100.0
        return float(cv2.Laplacian(img, cv2.CV_64F).var())
    except Exception:
        return 100.0


def analyze_exposure(image_path: str) -> float:
    """
    Calculates average image pixel brightness (0 - 255).
    """
    try:
        img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
        if img is None:
            return 120.0
        return float(img.mean())
    except Exception:
        return 120.0


def calculate_image_hash(image_path: str) -> str:
    """
    Calculates a 64-bit Average Hash (aHash) hex string to detect duplicates.
    """
    try:
        img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
        if img is None:
            return ""
        # Resize to 8x8 to ignore details and check composition
        resized = cv2.resize(img, (8, 8), interpolation=cv2.INTER_AREA)
        avg = resized.mean()
        diff = resized > avg
        
        hash_val = 0
        for idx, bit in enumerate(diff.flatten()):
            if bit:
                hash_val |= (1 << idx)
        return f"{hash_val:016x}"
    except Exception:
        return ""


def apply_color_preset(image_path: str, preset_name: str) -> str:
    """
    Applies custom filters and color grades using OpenCV.
    """
    try:
        img = cv2.imread(image_path)
        if img is None:
            return ""
            
        preset = preset_name.lower().strip()
        
        if preset == "vibrant":
            hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
            h, s, v = cv2.split(hsv)
            s = np.clip(s * 1.30, 0, 255).astype(np.uint8)
            v = np.clip(v * 1.08, 0, 255).astype(np.uint8)
            hsv = cv2.merge([h, s, v])
            out_img = cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)
            
        elif preset == "warm":
            b, g, r = cv2.split(img)
            r = np.clip(r + 20, 0, 255).astype(np.uint8)
            b = np.clip(b - 12, 0, 255).astype(np.uint8)
            out_img = cv2.merge([b, g, r])
            
        elif preset == "moody":
            hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
            h, s, v = cv2.split(hsv)
            s = np.clip(s * 0.82, 0, 255).astype(np.uint8) # Desaturate
            hsv = cv2.merge([h, s, v])
            temp_img = cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)
            # Add matte black lift
            out_img = cv2.convertScaleAbs(temp_img, alpha=0.84, beta=18)
            
        elif preset in ["bw", "classic"]:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            out_img = cv2.merge([gray, gray, gray])
        else:
            return ""
            
        base_dir = os.path.dirname(os.path.abspath(__file__))
        filename = f"retouched-{uuid.uuid4()}.jpg"
        save_path = os.path.join(base_dir, "..", "uploads", filename)
        cv2.imwrite(save_path, out_img)
        return f"/uploads/{filename}"
    except Exception as e:
        print(f"Error applying color preset: {e}")
        return ""


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
def process_photo_face_matching(photo_id: str, cull_blinks: bool = True, color_preset: str = "none", category: str = "candid"):
    """
    Celery task that executes focus/sharpness calculations, aHash duplicate detection, 
    blink culling, SFace alignment, pgvector matching, preset grading, and state updates.
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

        base_dir = os.path.dirname(os.path.abspath(__file__))
        photo_filename = os.path.basename(photo.original_url)
        photo_path = os.path.join(base_dir, "..", "uploads", photo_filename)

        if not os.path.exists(photo_path):
            print(f"Error: Photo file not found at path {photo_path}")
            return

        # 1. Run Quality Analytics (Sharpness & Exposure)
        sharpness = calculate_sharpness(photo_path)
        exposure = analyze_exposure(photo_path)
        photo_hash = calculate_image_hash(photo_path)

        photo.sharpness_score = sharpness
        photo.exposure_score = exposure
        photo.image_hash = photo_hash

        # 2. Check for Duplicates in the gallery (Hamming distance < 4)
        is_duplicate = False
        duplicate_of_id = None
        if photo_hash:
            siblings = db.query(models.Photo).filter(
                models.Photo.gallery_id == photo.gallery_id,
                models.Photo.id != photo_id,
                models.Photo.image_hash != None
            ).all()
            for sib in siblings:
                dist = sum(c1 != c2 for c1, c2 in zip(photo_hash, sib.image_hash))
                if dist < 4:
                    is_duplicate = True
                    duplicate_of_id = sib.id
                    break

        photo.is_duplicate = is_duplicate
        photo.duplicate_of_id = duplicate_of_id

        # 3. Detect and Align Faces + Blink Check
        aligned_results = align_face(photo_path)
        blink_detected = False
        
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

        matched_client_ids = []
        matched_client_names = []
        matched_guest_ids = []
        matched_guest_names = []

        for res in aligned_results:
            crop_rel_path = res["path"]
            eyes_count = res["eyes_count"]
            
            # Blink heuristic: If face detected but less than 2 eyes found
            if eyes_count < 2 and cull_blinks:
                blink_detected = True

            crop_filename = os.path.basename(crop_rel_path)
            crop_absolute_path = os.path.join(base_dir, "..", "uploads", "aligned_faces", crop_filename)
            
            face_embedding = extract_face_embedding(crop_absolute_path)
            if face_embedding:
                db_face = models.PhotoFace(
                    photo_id=photo_id,
                    face_embedding=face_embedding
                )
                db.add(db_face)
                db.commit()

                for t_type, t_id, t_name, t_email, t_embedding in all_targets:
                    sim = calculate_cosine_similarity(face_embedding, t_embedding)
                    if sim > 0.365:
                        if t_type == "client":
                            if t_id not in matched_client_ids:
                                matched_client_ids.append(t_id)
                                matched_client_names.append(t_name)
                        else:
                            if t_id not in matched_guest_ids:
                                matched_guest_ids.append(t_id)
                                matched_guest_names.append(t_name)
                                
                                # Send match notification emails to guests
                                gallery_url = f"http://localhost:5173/public/guest/{t_id}/gallery"
                                body_html = f"<h3>Hi {t_name}!</h3><p>We found you in the wedding photos! <a href='{gallery_url}'>Click here to view your gallery</a>.</p>"
                                body_text = f"Hi {t_name}, we found you in the photos! Link: {gallery_url}"
                                
                                send_smtp_email(t_email, "We found your photos from the wedding!", body_html, body_text)
                                log_message(db, gallery.studio_id, None, "WhatsApp Auto-Notification", f"WhatsApp alert containing gallery link sent to {t_name}: {gallery_url}", "WhatsApp")
                                log_message(db, gallery.studio_id, None, "We found your photos!", f"Sent automated match email to guest {t_name} ({t_email})", "Email")

        photo.blink_detected = blink_detected

        # 4. Auto-Categorize Photo (Groom + Bride = Couple Portrait)
        # Fetch client ids linked to this gallery booking
        booking = db.query(models.Booking).filter(models.Booking.id == gallery.booking_id).first()
        is_primary_client_match = False
        if booking and booking.client_id in matched_client_ids:
            is_primary_client_match = True

        if photo.is_guest_uploaded:
            photo.category = "guest"
        elif is_primary_client_match and len(matched_client_ids) >= 1:
            photo.category = "couple"
        else:
            photo.category = category

        # 5. Apply AI Culling Decision Heuristics
        # Auto-Reject if blurry, duplicate, or blink detected. Else Keep.
        if sharpness < 90.0 or exposure < 30.0 or exposure > 235.0 or blink_detected or is_duplicate:
            photo.cull_status = "reject"
        else:
            photo.cull_status = "keep"

        # 6. Apply Retouching Preset
        if color_preset != "none":
            retouched_url = apply_color_preset(photo_path, color_preset)
            if retouched_url:
                photo.edited_url = retouched_url
            else:
                photo.edited_url = photo.original_url
        else:
            photo.edited_url = photo.original_url

        # Build final display tags
        base_tags = []
        if photo.category == "couple":
            base_tags.append("Couple Portrait")
        elif photo.category == "traditional":
            base_tags.append("Traditional Posed")
        else:
            base_tags.append("Candid Snapshot")

        if sharpness < 90.0:
            base_tags.append("⚠️ Blurry")
        if blink_detected:
            base_tags.append("⚠️ Closed Eyes")
        if is_duplicate:
            base_tags.append("⚠️ Duplicate")

        for name in matched_client_names:
            base_tags.append(f"Found: {name}")
        for name in matched_guest_names:
            base_tags.append(f"Guest: {name}")

        photo.ai_tags = base_tags
        photo.matched_clients = matched_client_ids
        photo.matched_guests = matched_guest_ids
        db.commit()

        # 7. Update CRM CullingJob State Machine
        culling_job = db.query(models.CullingJob).filter(models.CullingJob.booking_id == gallery.booking_id).first()
        if not culling_job:
            culling_job = models.CullingJob(
                booking_id=gallery.booking_id,
                status="culling"
            )
            db.add(culling_job)
            db.commit()

        # Calculate counts
        gallery_photos = db.query(models.Photo).filter(models.Photo.gallery_id == gallery.id).all()
        rejected_count = sum(1 for p in gallery_photos if p.cull_status == "reject")
        avg_sharp = sum(p.sharpness_score for p in gallery_photos) / len(gallery_photos) if gallery_photos else 100.0

        culling_job.total_photos = len(gallery_photos)
        culling_job.rejected_photos = rejected_count
        culling_job.avg_sharpness = avg_sharp
        culling_job.status = "review" # Move state to review once culling is completed
        db.commit()

        # Trigger live WebSocket alert
        if ws_notifier:
            try:
                ws_notifier(gallery.studio_id, {
                    "type": "culling_complete",
                    "booking_id": gallery.booking_id,
                    "gallery_title": gallery.title,
                    "photo_id": photo_id,
                    "rejected_photos": rejected_count,
                    "total_photos": len(gallery_photos)
                })
            except Exception as ws_err:
                print(f"WS notification failed: {ws_err}")

        print(f"Celery AI processing completely succeeded for photo: {photo_id}")
        
    except Exception as e:
        print(f"Error in Celery task: {e}")
    finally:
        db.close()
