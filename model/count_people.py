import cv2
from ultralytics import YOLO
import threading
import json
import time

model = YOLO("yolov8s.pt")

camera_people_count = {}
lock = threading.Lock()

def process_video(video_path):
    cap = cv2.VideoCapture(video_path)

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        results = model(frame, classes=[0])  # person class
        count = len(results[0].boxes)

        with lock:
            camera_people_count[video_path] = count

            # write counts to JSON
            with open("counts.json", "w") as f:
                json.dump(camera_people_count, f)

        print(f"{video_path}: People = {count}")
        time.sleep(1)  # optional (reduces CPU)

video_list = ["./assets/cctv2.mp4", "./assets/cctv3.mp4"]

threads = []

for video in video_list:
    t = threading.Thread(target=process_video, args=(video,))
    t.start()
    threads.append(t)

for t in threads:
    t.join()
