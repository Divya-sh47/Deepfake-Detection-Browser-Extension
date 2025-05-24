
console.log("🔍 Deepfake Detector content script loaded");

// Add detection icon to a video element
function addDetectionIconToVideo(video) {
    if (video.dataset.deepfakeIconAttached === "true") return;

    const icon = document.createElement('div');
    icon.textContent = 'D';
    Object.assign(icon.style, {
        position: 'absolute',
        width: '50px',
        height: '50px',
        borderRadius: '50%',
        backgroundColor: '#43A047',
        color: 'white',
        fontSize: '24px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        cursor: 'pointer',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.25)',
        zIndex: '9999',
        right: '10px',
        bottom: '10px'
    });

    const wrapper = document.createElement('div');
    wrapper.classList.add('deepfake-wrapper');
    wrapper.style.position = 'relative';
    wrapper.style.display = 'inline-block';

    video.parentNode.insertBefore(wrapper, video);
    wrapper.appendChild(video);
    wrapper.appendChild(icon);

    icon.addEventListener('click', () => showDetectionPopup(icon, video));

    video.dataset.deepfakeIconAttached = "true";
}

// Send 3s of video to Flask backend
async function fetchDetectionResult(video) {
    if (!video.captureStream) {
        return {
            prediction: "error",
            confidence: 0,
            score: 0,
            message: "Browser does not support captureStream API"
        };
    }

    try {
        const stream = video.captureStream();
        const recorder = new MediaRecorder(stream);
        const chunks = [];

        recorder.ondataavailable = e => e.data && chunks.push(e.data);

        return await new Promise((resolve) => {
            recorder.onstop = async () => {
                const blob = new Blob(chunks, { type: "video/mp4" });
                const formData = new FormData();
                formData.append("video", blob, "video.mp4");

                try {
                    const res = await fetch("http://localhost:5000/process-video", {
                        method: "POST",
                        body: formData
                    });

                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || "Backend error");
                    resolve(data);
                } catch (err) {
                    resolve({
                        prediction: "error",
                        confidence: 0,
                        score: 0,
                        message: err.message
                    });
                }
            };

            recorder.start();
            setTimeout(() => recorder.stop(), 3000);
        });

    } catch (err) {
        return {
            prediction: "error",
            confidence: 0,
            score: 0,
            message: "Failed to capture video: " + err.message
        };
    }
}

// Show popup with detection results
async function showDetectionPopup(icon, video) {
    const oldPopup = document.getElementById('deepfake-popup');
    if (oldPopup) oldPopup.remove();

    const popup = document.createElement('div');
    popup.id = 'deepfake-popup';
    Object.assign(popup.style, {
        position: 'absolute',
        top: '60px',
        right: '0px',
        background: '#ffffff',
        border: '1px solid #ccc',
        borderRadius: '10px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        padding: '12px',
        minWidth: '220px',
        zIndex: '99999'
    });
    popup.innerText = 'Analyzing video...';
    icon.parentElement.appendChild(popup);

    const result = await fetchDetectionResult(video);

    if (result.prediction === "error") {
        popup.innerHTML = `<div style="color:#d00000; font-weight:bold;">Error:</div>
                           <div>${result.message || "Failed to analyze video."}</div>`;
        video.style.border = '';
    } else {
        const score = result.score?.toFixed(2) ?? '0.00';
        const confidence = (result.confidence * 100)?.toFixed(2) ?? '0.00';
        const prediction = result.prediction?.toUpperCase() ?? 'UNKNOWN';

        popup.innerHTML = `
            <div style="color:#d00000; font-weight: bold; margin-bottom: 8px;">Deepfake Detection Results</div>
            <div>Score: ${score}</div>
            <div>Prediction: ${prediction}</div>
            <div>Confidence: ${confidence}%</div>
        `;

        if (prediction === 'FAKE') {
            video.style.border = '5px solid red';
        } else if (prediction === 'REAL') {
            video.style.border = '5px solid green';
        } else {
            video.style.border = '';
        }
    }

    document.addEventListener('click', function outsideClick(event) {
        if (!popup.contains(event.target) && event.target !== icon) {
            popup.remove();
            document.removeEventListener('click', outsideClick);
        }
    });
}

// Observe video additions dynamically
function observeVideos() {
    const observer = new MutationObserver(() => {
        document.querySelectorAll('video').forEach(video => {
            if (!video.dataset.deepfakeIconAttached) {
                console.log("🎥 Found video element");
                addDetectionIconToVideo(video);
            }
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Initial check
    document.querySelectorAll('video').forEach(video => {
        if (!video.dataset.deepfakeIconAttached) {
            console.log("🎥 Found existing video");
            addDetectionIconToVideo(video);
        }
    });
}

observeVideos();
