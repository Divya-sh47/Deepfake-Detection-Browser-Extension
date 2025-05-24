# Deepfake-Detection-Browser-Extension

This project combines a **Chrome Extension** and a **Flask backend** to detect deepfake videos. The extension captures videos from a webpage and sends them to the backend, which uses a deep learning model to analyze and return predictions.

---

## 📁 Folder Structure
project-root/
│
├── app.py                  # Flask backend
├── xception_model.h5       # Trained model file
├── downloaded_videos/      # Temporarily stores uploaded videos
├── video_frames/           # Stores extracted video frames
├── static/                 # Contains test page and sample videos
│ ├── test.html             # Test page to trigger extension 
│ ├── video1.mp4
│ ├── video2.mp4
│ └── video3.mp4
├── frontend/               # Chrome extension files
│ ├── manifest.json
│ ├── content.js
│ └── (etc.)
└── requirements.txt        # Python dependencies


---

## ⚙️ Backend Setup

### 1. 🔃 Create a Virtual Environment
--bash
python -m venv .venv

### 2. 🚀 Activate the Environment
Windows:
.venv\Scripts\activate

### 3. 📦 Install Python Dependencies
pip install -r requirements.txt

### 🔽 Install FFmpeg:
Because this project uses ffmpeg to convert .webm videos (captured from browser) into .mp4 format (needed by OpenCV).

### 🚀 Running the Project
1️⃣ Run Flask Backend (on port 5000)
python app.py
2️⃣ Run Test HTML Page (on port 8000)
In a separate terminal:
cd static
python -m http.server 8000

### Then open this in your browser:
http://localhost:8000/test.html

### 🧩 Load the Chrome Extension
1. Open Chrome → go to chrome://extensions/
2. Enable Developer mode
3. Click "Load unpacked"
4. Select the extension/ folder
Now when you open the test page (test.html), the extension will detect the videos and interact with the Flask backend.

### 📊 Prediction Explanation
The backend returns a confidence score and calculated from the average prediction of multiple video frames.

### ✅ Classification Threshold:
1. Real: if score > 0.7
2. Fake: if score ≤ 0.7

### 📝 Notes
1. Use two separate terminals to run the Flask server (5000) and the test page server (8000).
2. Ensure videos (video1.mp4, video2.mp4, etc.) are placed inside the static/ folder.
3. Make sure the model file xception_model.h5 is in the root directory.
4. Ensure ffmpeg is correctly installed and available in your system’s PATH.

✅ This is a real-time project, and it works on most websites that use normal <video> elements.
⚠️ However, some websites (like YouTube) implement security policies (like CORS, sandboxing, or cross-origin streaming protections) which prevent the extension from capturing their video content. This is a browser-level security limitation, not a bug in the project.
🧩 If the extension fails to work on such sites, you’ll often see related errors or warnings in the browser console (e.g., CORS blocked, captureStream not allowed, etc.).
🧪 That’s why we created the test.html page inside the static/ folder — it provides a controlled environment for demo/testing, so you can clearly see how the detection system works without security interference.

