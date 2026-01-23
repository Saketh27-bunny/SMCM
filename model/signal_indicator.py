import json
import time
import os

INPUT_FILE = "counts.json"

def get_signal(count):
    if count > 15:
        return "🔴 RED  (Overcrowded)"
    elif 10 <= count <= 14:
        return "🔵 BLUE (Moderate)"
    else:
        return "🟢 GREEN (Safe)"

def clear_console():
    os.system("cls" if os.name == "nt" else "clear")

def show_dashboard():
    while True:
        clear_console()
        print("🚇 METRO COMPARTMENT CROWD DASHBOARD")
        print("=" * 45)

        try:
            with open(INPUT_FILE, "r") as f:
                data = json.load(f)

            for cam, info in data.items():
                count = info["count"]
                time_stamp = info["timestamp"]
                signal = get_signal(count)

                print(f"""
📍 {cam}
   👥 People : {count}
   🚦 Signal : {signal}
   ⏱️ Updated: {time_stamp}
----------------------------------------
""")

        except FileNotFoundError:
            print("⏳ Waiting for people count data...")

        time.sleep(3)  # dashboard refresh rate


if __name__ == "__main__":
    show_dashboard()
