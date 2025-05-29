import os
import pytz
import requests
import subprocess
from datetime import datetime
from flask import Flask, request, jsonify

from api.log_config import setup_logger

SEND_NOTIFICATIONS = os.getenv("SendAPINotifications", "true").lower() in ("1", "true", "yes", "on")
DISCORD_WEBHOOK_URL = os.getenv("DiscordWebhookUrl")
TIME_ZONE = os.getenv("TimeZone", "UTC")

# Configure logging
log = setup_logger(__name__)

app = Flask(__name__)

@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({"status": "healthy"}), 200

@app.route("/restart", methods=["POST"])
def restart():
    data = request.get_json()

    if not data:
        log.warning("No JSON Payload Received.")

        return jsonify({"error": "No JSON Received"}), 400

    monitor = data.get("monitor")
    heartbeat = data.get("heartbeat")

    # If both monitor and heartbeat are None, redirect to /health
    if monitor is None and heartbeat is None:
        log.info("Both 'monitor' and 'heartbeat' are None. Redirecting to /health.")

        return health_check()

    if monitor is None:
        log.warning("No 'monitor' Object in Payload.")

        return jsonify({"error": "No 'monitor' Object in Payload"}), 400

    if heartbeat is None:
        log.warning("No 'heartbeat' Object in Payload.")

        return jsonify({"error": "No 'heartbeat' Object in Payload"}), 400

    monitor = monitor or {}
    heartbeat = heartbeat or {}
    status = heartbeat.get("status")
    description = monitor.get("description", "")
    service_url = monitor.get("url", "")

    container_name = None
    if description and description.startswith("container-"):
        container_name = description.split("container-", 1)[1]

    if not container_name:
        container_name = monitor.get("name")

    if not container_name:
        log.error("No Container Could be Determined from Payload.")

        return jsonify({"error": "No Container Name Found"}), 400

    if status != 0:       
        return jsonify({"message": f"Ignored {container_name}, Status: {status}"}), 200

    # Check if the container exists
    check = subprocess.run(
        ["docker", "ps", "-a", "--format", "{{.Names}}"],
        capture_output=True,
        text=True
    )

    existing_containers = check.stdout.strip().splitlines()
    if container_name not in existing_containers:
        log.warning(f"Container '{container_name}' Not Found.")

        return jsonify({
            "error": "container_not_found",
            "details": f"Container '{container_name}' Not Found",
            "container": container_name
        }), 404

    # Restart the container
    result = subprocess.run(["docker", "restart", container_name], capture_output=True, text=True)

    if result.returncode == 0:
        log.info(f"Container '{container_name}' Restarted Successfully.")

        service_name = monitor.get("name", container_name)
        time_zone = heartbeat.get("timezone") or TIME_ZONE

        if SEND_NOTIFICATIONS:
            send_discord_notification(
                service_name=service_name,
                service_url=service_url,
                time_zone=time_zone
            )

        return jsonify({"status": f"{container_name} Restarted"}), 200
    else:
        log.error(f"Failed to Restart '{container_name}': {result.stderr.strip()}")

        return jsonify({
            "error": "failed",
            "details": result.stderr.strip(),
            "container": container_name
        }), 500

def send_discord_notification(service_name: str, service_url: str, time_zone: str):
    if not DISCORD_WEBHOOK_URL:
        log.warning("DISCORD_WEBHOOK_URL not Set — Skipping Notification.")
        
        return

    try:
        now = datetime.now(pytz.timezone(time_zone)).strftime("%Y-%m-%d %H:%M:%S")
    except Exception:
        now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

    embed = {
        "title": f"✅ {service_name} Restarted! ✅",
        "color": 0x00ff00,
        "fields": [
            {"name": "Name", "value": service_name, "inline": False},
            {"name": "URL", "value": service_url or 'N/A', "inline": False},
            {"name": "Time", "value": now, "inline": False}
        ],
        "footer": {
            "text": "Uptime Kuma Auto Recovery"
        }
    }

    payload = {
        "embeds": [embed]
    }

    try:
        response = requests.post(DISCORD_WEBHOOK_URL, json=payload)

        if response.status_code in (200, 204):
            log.info(f"✅ Discord Notification Sent for {service_name}")
        else:
            log.warning(f"⚠️ Discord Webhook Returned {response.status_code}: {response.text}")
    except Exception as e:
        log.error(f"❌ Failed to Send Discord Notification: {e}")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=7000, debug=False)