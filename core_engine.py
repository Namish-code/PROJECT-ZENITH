import math
from datetime import datetime

from skyfield.api import Topos, load

from satellite_tracker import compute_satellite_telemetry

class SpaceEngine:
    def __init__(self):
        self.ts = load.timescale()
        self.planets = load('de421.bsp')
        self.earth = self.planets['earth']
        self.celestial_targets = {
            "Sun": self.planets['sun'],
            "Moon": self.planets['moon'],
            "Mercury": self.planets['MERCURY BARYCENTER'],
            "Venus": self.planets['VENUS BARYCENTER'],
            "Mars": self.planets['mars'],
            "Jupiter": self.planets['JUPITER BARYCENTER'],
            "Saturn": self.planets['SATURN BARYCENTER'],
            "Uranus": self.planets['URANUS BARYCENTER'],
            "Neptune": self.planets['NEPTUNE BARYCENTER']
        }

    def get_coords_at_time(self, lat: float, lon: float, time_target: datetime, satellite_list: list):
        from datetime import timezone
        t = self.ts.from_datetime(time_target.replace(tzinfo=timezone.utc))
        observer = self.earth + Topos(latitude_degrees=lat, longitude_degrees=lon)
        
        telemetry_matrix = {"cosmic_objects": [], "satellites": []}

# 1. Planetary & Sun Processing (Feature 4 & 8)
        for name, target in self.celestial_targets.items():
            astrometric = observer.at(t).observe(target)
            alt, az, distance = astrometric.apparent().altaz()
            
            is_sun = (name == "Sun")
            
            # Calculate 24h trajectory path for Sun and Moon (vectorized, 1-hour intervals)
            path_points = []
            if name in ["Sun", "Moon"]:
                from datetime import timedelta
                dts = [time_target + timedelta(hours=h) for h in range(-12, 13)]
                t_offsets = self.ts.from_datetimes([dt.replace(tzinfo=timezone.utc) for dt in dts])
                astrometric_offsets = observer.at(t_offsets).observe(target)
                alt_offsets, az_offsets, _ = astrometric_offsets.apparent().altaz()
                for el_val, az_val in zip(alt_offsets.degrees, az_offsets.degrees):
                    path_points.append({
                        "azimuth": round(float(az_val), 2),
                        "elevation": round(float(el_val), 2)
                    })

            # Explicitly cast NumPy types to native Python types to prevent FastAPI serialization crashes
            telemetry_matrix["cosmic_objects"].append({
                "name": name,
                "elevation": round(float(alt.degrees), 2),
                "azimuth": round(float(az.degrees), 2),
                "distance_km": round(float(distance.km), 2),
                "is_visible": bool(alt.degrees > 0),
                "zero_shadow_eligible": bool(is_sun and (alt.degrees >= 89.5)),
                "path_points": path_points
            })


        telemetry_matrix["satellites"] = compute_satellite_telemetry(
            lat,
            lon,
            time_target,
            satellite_list,
            ts=self.ts,
            earth=self.earth,
        )

        return telemetry_matrix

def detect_conjunctions(telemetry_data: dict, threshold_degrees: float = 4.0):
    """Feature 6: Conjunction Detector Engine"""
    all_objects = []
    for obj in telemetry_data["cosmic_objects"]:
        if obj["is_visible"] and obj["elevation"] >= 20:
            all_objects.append(obj)
    for sat in telemetry_data["satellites"]:
        if sat["elevation"] >= 20:
            all_objects.append(sat)
            
    conjunctions = []
    for i in range(len(all_objects)):
        for j in range(i + 1, len(all_objects)):
            obj1 = all_objects[i]
            obj2 = all_objects[j]
            el1 = math.radians(obj1["elevation"])
            az1 = math.radians(obj1["azimuth"])
            el2 = math.radians(obj2["elevation"])
            az2 = math.radians(obj2["azimuth"])
            
            cos_sep = math.sin(el1) * math.sin(el2) + math.cos(el1) * math.cos(el2) * math.cos(az1 - az2)
            cos_sep = max(-1.0, min(1.0, cos_sep))
            angular_gap = math.degrees(math.acos(cos_sep))
            
            if angular_gap <= threshold_degrees:
                conjunctions.append({
                    "severity": "CRITICAL" if angular_gap <= 1.5 else "WARNING",
                    "summary": f"Alignment Event: {obj1['name']} and {obj2['name']}",
                    "details": f"Separation: {round(angular_gap, 2)}° at Elev: {round(obj1['elevation'], 2)}°"
                })
    return conjunctions

def generate_sky_story(telemetry_data: dict, conjunctions: list):
    """Feature 7: Live Sky Story Narrative Engine"""
    story_chunks = []
    if conjunctions:
        story_chunks.append(f"ALERT: A visual alignment is taking place overhead. {conjunctions[0]['summary']} with an angular gap of just {conjunctions[0]['details'].split('Separation: ')[1]}.")
    
    iss_track = next((s for s in telemetry_data["satellites"] if "ISS" in s["name"].upper()), None)
    sun_track = next((c for c in telemetry_data["cosmic_objects"] if c["name"] == "Sun"), None)
    
    if iss_track:
        if iss_track["elevation"] >= 75:
            story_chunks.append(f"The ISS is cutting through your true Zenith sector right now at {iss_track['distance_km']} km away, traveling at {iss_track['velocity_kms']} km/s.")
        else:
            story_chunks.append(f"The ISS is climbing along your horizon, tracked at {iss_track['elevation']}° elevation.")
            
    if sun_track and sun_track["zero_shadow_eligible"]:
        story_chunks.append("PHENOMENON: Zero Shadow event active! The Sun is occupying your absolute vertical Zenith point.")
        
    if not story_chunks:
        visible_planets = [p["name"] for p in telemetry_data["cosmic_objects"] if p["is_visible"] and p["name"] != "Sun"]
        if visible_planets:
            story_chunks.append(f"Sky field calm. Your dashboard tracking lock is holding steady on planetary positions: {', '.join(visible_planets)}.")
        else:
            story_chunks.append("Zenith vector scanning. Low earth orbit payload streams nominal. No major deep-space bodies intersecting your local dome quadrant currently.")
            
    return " ".join(story_chunks)