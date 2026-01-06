import json
import time

def get_signal(count):
    if count > 15:
        return "🔴 RED"
    elif 10 <= count <= 14:
        return "🔵 BLUE"
    else:
        return "🟢 GREEN"

def indicate_signals():
    while True:
        try:
            with open("counts.json", "r") as f:
                camera_people_count = json.load(f)

            print("\n--- SIGNAL STATUS ---")
            for cam, count in camera_people_count.items():
                signal = get_signal(count)
                print(f"{cam}: People = {count} → Signal = {signal}")

        except FileNotFoundError:
            print("Waiting for counts.json...")

        time.sleep(2)  # repeat every 20 seconds

if __name__ == "__main__":
    indicate_signals()
