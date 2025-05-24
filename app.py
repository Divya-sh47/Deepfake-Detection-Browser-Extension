
import os
import numpy as np
import cv2
import subprocess
from tensorflow.keras.preprocessing import image
from tensorflow.keras.models import load_model
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Load model once at startup
model = load_model("xception_model.h5")
print("✅ [LOG] Model loaded successfully")

# Directories for videos and frames
VIDEO_DIR = "downloaded_videos"
FRAME_DIR = "video_frames"
os.makedirs(VIDEO_DIR, exist_ok=True)
os.makedirs(FRAME_DIR, exist_ok=True)

def extract_frames(video_path, output_dir, frames_per_segment=10, segment_duration=5):
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = total_frames / fps if fps else 0

    frame_id = 0
    segment_start = 0

    while segment_start < duration:
        for i in range(frames_per_segment):
            t = segment_start + (i + 1) * segment_duration / (frames_per_segment + 1)
            if t > duration:
                break
            cap.set(cv2.CAP_PROP_POS_MSEC, t * 1000)
            ret, frame = cap.read()
            if ret:
                frame_path = os.path.join(output_dir, f"frame_{frame_id:04d}.jpg")
                cv2.imwrite(frame_path, frame)
                frame_id += 1
        segment_start += segment_duration

    cap.release()
    print(f"🖼️ [LOG] Extracted {frame_id} frames.")

def predict_on_frames(folder):
    frame_files = sorted(os.listdir(folder))
    predictions = []

    for file in frame_files:
        img_path = os.path.join(folder, file)
        img = image.load_img(img_path, target_size=(299, 299))
        img_array = image.img_to_array(img)
        img_array = np.expand_dims(img_array, axis=0) / 255.0

        pred = model.predict(img_array)
        predictions.append(pred[0][0])

    return predictions

@app.before_request
def log_every_request():
    print(f"👉 [LOG] {request.method} to {request.path}")

@app.route('/process-video', methods=['POST'])
def process_video():
    print("📥 [LOG] /process-video endpoint was hit")
    try:
        if 'video' not in request.files:
            return jsonify({"error": "No video file received"}), 400

        # Save uploaded video (from Chrome extension)
        webm_path = os.path.join(VIDEO_DIR, "input_video.webm")
        mp4_path = os.path.join(VIDEO_DIR, "converted_video.mp4")

        video_file = request.files['video']
        video_file.save(webm_path)
        print(f"✅ [LOG] Video saved to: {webm_path}")

        # Convert to MP4 using ffmpeg
        cmd = ['ffmpeg', '-y', '-i', webm_path, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', mp4_path]
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if result.returncode != 0:
            print("❌ [ERROR] ffmpeg failed:", result.stderr.decode())
            return jsonify({"error": "ffmpeg conversion failed"}), 500

        print("🎞️ [LOG] Video converted to MP4 for OpenCV")

        # Clear old frames
        for f in os.listdir(FRAME_DIR):
            os.remove(os.path.join(FRAME_DIR, f))

        # Extract and predict
        extract_frames(mp4_path, FRAME_DIR)
        preds = predict_on_frames(FRAME_DIR)
        avg_pred = np.mean(preds) if preds else 0.0

        result = {
            "score": float(avg_pred),
            "prediction": "Real" if avg_pred > 0.7 else "Fake",
            "confidence": float(avg_pred)
        }

        print(f"✅ [LOG] Prediction result: {result}")
        return jsonify(result)

    except Exception as e:
        print("❌ [ERROR] Could not process video:", str(e))
        return jsonify({"error": str(e)}), 500

# Serve the test HTML page from the static folder
@app.route('/test')
def test_page():
    return send_from_directory('static', 'test.html')

if __name__ == '__main__':
    app.run(debug=True, port=5000)
