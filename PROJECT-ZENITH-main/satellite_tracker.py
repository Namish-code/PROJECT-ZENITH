"""Live TLE fetch and Skyfield-based tracking for ISS and Starlink satellites."""

import json
import os
from datetime import datetime, timezone, timedelta

import numpy as np
import requests
from skyfield.api import EarthSatellite, load, wgs84

ISS_NAME = "ISS (ZARYA)"
ISS_NORAD_ID = 25544
MAX_SATELLITE_COUNT = 30

CELESTRAK_VISUAL_URL = "https://celestrak.org/NORAD/elements/gp.php?GROUP=visual&FORMAT=TLE"

NOIDA_GROUND_STATION = {
    "name": "GS-NOIDA",
    "lat": 28.53,
    "lon": 77.39,
}

_tle_cache: list[dict] = []


def _parse_tle_text(tle_text: str) -> list[dict]:
    lines = [line.rstrip() for line in tle_text.splitlines() if line.strip()]
    entries: list[dict] = []
    index = 0

    while index + 2 < len(lines):
        name = lines[index].strip()
        line1 = lines[index + 1].strip()
        line2 = lines[index + 2].strip()

        if line1.startswith("1 ") and line2.startswith("2 "):
            norad_token = line1.split()[1]
            norad_id = int(norad_token.replace("U", "").replace("C", ""))
            entries.append({
                "OBJECT_NAME": name,
                "NORAD_CAT_ID": norad_id,
                "TLE_LINE1": line1,
                "TLE_LINE2": line2,
            })
            index += 3
        else:
            index += 1

    return entries


def _fetch_tle_catalog(url: str) -> list[dict]:
    response = requests.get(url, timeout=8)
    if response.status_code != 200:
        return []
    return _parse_tle_text(response.text)


def _fallback_tles() -> list[dict]:
    if os.path.exists("active_satellites.json"):
        with open("active_satellites.json", "r", encoding="utf-8") as handle:
            catalog = json.load(handle)
            tracked = [
                entry for entry in catalog
                if entry.get("TLE_LINE1") and entry.get("TLE_LINE2")
                and (
                    entry.get("NORAD_CAT_ID") == ISS_NORAD_ID
                    or "STARLINK" in entry.get("OBJECT_NAME", "").upper()
                )
            ]
            if tracked:
                return tracked[: 1 + STARLINK_FETCH_COUNT]

    return [
        {
            "OBJECT_NAME": ISS_NAME,
            "NORAD_CAT_ID": ISS_NORAD_ID,
            "TLE_LINE1": "1 25544U 98067A   26174.52445620  .00016717  00000-0  30242-3 0  9999",
            "TLE_LINE2": "2 25544  51.6415 162.1133 0001617  44.1234  316.0123 15.4987654343210",
        },
        {
            "OBJECT_NAME": "STARLINK-2401",
            "NORAD_CAT_ID": 48274,
            "TLE_LINE1": "1 48274U 21035A   26174.58333333  .00001234  00000-0  12345-4 0  9990",
            "TLE_LINE2": "2 48274  53.0543 123.4567 0001234  90.0000 270.0000 15.0639876543210",
        },
        {
            "OBJECT_NAME": "STARLINK-2402",
            "NORAD_CAT_ID": 48275,
            "TLE_LINE1": "1 48275U 21035B   26174.58333333  .00001234  00000-0  12345-4 0  9991",
            "TLE_LINE2": "2 48275  53.0543 124.4567 0001234  91.0000 269.0000 15.0639876543210",
        },
    ]


def fetch_tracked_tles(force_refresh: bool = False) -> list[dict]:
    """Fetch live TLE data for the brightest satellites from CelesTrak."""
    global _tle_cache

    if _tle_cache and not force_refresh:
        return _tle_cache

    tracked: list[dict] = []

    try:
        visual_catalog = _fetch_tle_catalog(CELESTRAK_VISUAL_URL)
        if visual_catalog:
            # Prioritize ISS (25544) and Tiangong space stations at the top of the feed
            iss_entry = next((sat for sat in visual_catalog if sat["NORAD_CAT_ID"] == ISS_NORAD_ID), None)
            tiangong_entry = next((sat for sat in visual_catalog if "TIANGONG" in sat["OBJECT_NAME"].upper() or "CSS" in sat["OBJECT_NAME"].upper()), None)
            
            other_sats = [
                sat for sat in visual_catalog 
                if sat["NORAD_CAT_ID"] != ISS_NORAD_ID 
                and (tiangong_entry is None or sat["NORAD_CAT_ID"] != tiangong_entry["NORAD_CAT_ID"])
            ]
            
            # Filter other_sats to prevent satellite trains (e.g. Starlinks, OneWebs) from cluttering the sky
            family_counts = {}
            filtered_other_sats = []
            for sat in other_sats:
                name = sat["OBJECT_NAME"].upper()
                family_key = None
                for fam in ["STARLINK", "ONEWEB", "FLOCK", "IRIDIUM", "GONETS", "COSMOS"]:
                    if fam in name:
                        family_key = fam
                        break
                
                if family_key:
                    family_counts[family_key] = family_counts.get(family_key, 0) + 1
                    if family_counts[family_key] <= 3:
                        filtered_other_sats.append(sat)
                else:
                    filtered_other_sats.append(sat)
            
            prioritized = []
            if iss_entry:
                prioritized.append(iss_entry)
            if tiangong_entry:
                prioritized.append(tiangong_entry)
                
            tracked = prioritized + filtered_other_sats
    except Exception:
        pass

    if not tracked:
        tracked = _fallback_tles()

    _tle_cache = tracked[:MAX_SATELLITE_COUNT]
    return _tle_cache


def compute_satellite_telemetry(
    lat: float,
    lon: float,
    time_target: datetime,
    satellite_list: list[dict],
    ts=None,
    earth=None,
) -> list[dict]:
    """Compute azimuth, elevation, orbital altitude, and slant range for tracked satellites."""
    if ts is None or earth is None:
        planets = load("de421.bsp")
        earth = planets["earth"]
        ts = load.timescale()

    t = ts.from_datetime(time_target.replace(tzinfo=timezone.utc))
    ground_station = wgs84.latlon(latitude_degrees=lat, longitude_degrees=lon)
    telemetry: list[dict] = []

    for sat in satellite_list:
        try:
            sat_model = EarthSatellite(
                sat["TLE_LINE1"],
                sat["TLE_LINE2"],
                sat["OBJECT_NAME"],
                ts,
            )
            geocentric = sat_model.at(t)
            subpoint = geocentric.subpoint()

            topocentric = (sat_model - ground_station).at(t)
            alt, az, distance = topocentric.altaz()

            # Compute projected path trajectory for the next 30 minutes (2-minute intervals)
            path_points = []
            for min_offset in range(0, 31, 2):
                t_offset = ts.from_datetime((time_target + timedelta(minutes=min_offset)).replace(tzinfo=timezone.utc))
                topocentric_offset = (sat_model - ground_station).at(t_offset)
                alt_offset, az_offset, _ = topocentric_offset.altaz()
                path_points.append({
                    "azimuth": round(float(az_offset.degrees), 2),
                    "elevation": round(float(alt_offset.degrees), 2)
                })

            telemetry.append({
                "id": sat["NORAD_CAT_ID"],
                "name": sat["OBJECT_NAME"],
                "azimuth": round(float(az.degrees), 2),
                "elevation": round(float(alt.degrees), 2),
                "altitude_km": round(float(subpoint.elevation.km), 2),
                "range_km": round(float(distance.km), 2),
                "distance_km": round(float(distance.km), 2),
                "velocity_kms": round(float(np.linalg.norm(geocentric.velocity.km_per_s)), 2),
                "is_visible": bool(alt.degrees > 0),
                "path_points": path_points,
            })
        except Exception:
            continue

    return telemetry
