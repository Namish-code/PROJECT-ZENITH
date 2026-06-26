import math
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from core_engine import SpaceEngine, detect_conjunctions, generate_sky_story
from satellite_tracker import NOIDA_GROUND_STATION, fetch_tracked_tles

app = FastAPI(title="Project Zenith Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = SpaceEngine()


@app.get("/api/v1/zenith-telemetry")
async def fetch_dashboard_telemetry(
    lat: float = NOIDA_GROUND_STATION["lat"],
    lon: float = NOIDA_GROUND_STATION["lon"],
    time_offset_hours: float = 0.0,
):
    computed_time = datetime.now(timezone.utc) + timedelta(hours=time_offset_hours)

    sat_list = fetch_tracked_tles()
    if not sat_list:
        raise HTTPException(status_code=503, detail="Satellite Data Pipeline Offline")

    raw_matrix = engine.get_coords_at_time(lat, lon, computed_time, sat_list)
    conjunction_alerts = detect_conjunctions(raw_matrix)
    sky_story_narration = generate_sky_story(raw_matrix, conjunction_alerts)

    # Extract data with safe fallbacks to prevent crash iterations
    satellites = raw_matrix.get("satellites", [])
    cosmic_objects = raw_matrix.get("cosmic_objects", [])

    conjunctions = []
    threshold_degrees = 8.0  # Alert threshold match window

    # Check intersections between every satellite and planet
    for sat in satellites:
        # Check safety boundaries for valid elevation values
        if sat.get("elevation") is None or sat["elevation"] < 0:
            continue

        sat_az = math.radians(sat["azimuth"])
        sat_el = math.radians(sat["elevation"])

        for obj in cosmic_objects:
            # Skip computation if coordinate telemetry data is invalid or missing
            if obj.get("elevation") is None or obj.get("azimuth") is None:
                continue
                
            if obj["name"] == "Sun" or not obj.get("is_visible", False):
                continue

            obj_az = math.radians(obj["azimuth"])
            obj_el = math.radians(obj["elevation"])

            # Spherical law of cosines formula
            cos_sep = math.sin(sat_el) * math.sin(obj_el) + math.cos(sat_el) * math.cos(obj_el) * math.cos(sat_az - obj_az)

            # Bound checking for floating point precision limits
            cos_sep = max(-1.0, min(1.0, cos_sep))
            separation = math.degrees(math.acos(cos_sep))

            if separation <= threshold_degrees:
                conjunctions.append(
                    {
                        "satellite": sat["name"],
                        "target": obj["name"],
                        "separation": round(separation, 2),
                        "severity": "CRITICAL" if separation <= 3.0 else "WARNING",
                    }
                )

    return {
        "calculated_timestamp": computed_time.strftime("%Y-%m-%d %H:%M:%S UTC"),
        "time_offset_applied": time_offset_hours,
        "ground_station": {
            "name": NOIDA_GROUND_STATION["name"],
            "lat": lat,
            "lon": lon,
        },
        "system_alerts": conjunction_alerts,
        "live_sky_story": sky_story_narration,
        "satellites": satellites,
        "cosmic_objects": cosmic_objects,
        "conjunctions": conjunctions,  # Seamless data mapping connection straight to UI header
    }


# --- Serve React Frontend ---
FRONTEND_DIST = Path(__file__).parent / "frontend" / "dist"

if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_react(full_path: str):
        """Catch-all: serve React's index.html for all non-API routes."""
        index = FRONTEND_DIST / "index.html"
        return FileResponse(index)