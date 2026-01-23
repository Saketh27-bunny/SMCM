import cv2
import time
import json
import threading
from ultralytics import YOLO

# Load YOLO model
model = YOLO("yolov8s.pt")

# Shared output file
OUTPUT_FILE = "counts.json"

# Lock for thread-safe file access
lock = threading.Lock()

def process_video(camera_name, video_path):
    cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():
        print(f"❌ Failed to open {video_path}")
        return

    while True:
        ret, frame = cap.read()
        if not ret:
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)  # loop video
            continue

        # Detect only persons (class 0)
        results = model(frame, classes=[0], conf=0.4)
        count = len(results[0].boxes)

        with lock:
            try:
                with open(OUTPUT_FILE, "r") as f:
                    data = json.load(f)
            except:
                data = {}

            data[camera_name] = {
                "count": count,
                "timestamp": time.strftime("%H:%M:%S")
            }

            with open(OUTPUT_FILE, "w") as f:
                json.dump(data, f, indent=4)

        print(f"{camera_name}: People = {count}")

        time.sleep(3)  # ⏱️ count every 3 seconds


if __name__ == "__main__":
    cameras = {
        "Compartment-1": "./assets/cctv1.mp4",
        "Compartment-2": "./assets/cctv2.mp4",
        "Compartment-3": "./assets/cctv3.mp4"
    }

    threads = []

    for cam_name, path in cameras.items():
        t = threading.Thread(target=process_video, args=(cam_name, path))
        t.start()
        threads.append(t)

    for t in threads:
        t.join()
