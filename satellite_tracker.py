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
    return [
        {
            "OBJECT_NAME": "ISS (ZARYA)",
            "NORAD_CAT_ID": 25544,
            "TLE_LINE1": "1 25544U 98067A   26177.72803434  .00000409  00000-0  10372-3 0  9993",
            "TLE_LINE2": "2 25544  51.6324 254.1054 0004309 234.2414 125.8174 15.49438531573196",
        },
        {
            "OBJECT_NAME": "CSS (TIANGONG)",
            "NORAD_CAT_ID": 48274,
            "TLE_LINE1": "1 48274U 21035A   26177.63772013  .00020548  00000+0  23874-3 0  9993",
            "TLE_LINE2": "2 48274  41.4690 264.4733 0007980 157.4644 202.6547 15.61217048294641",
        },
        {
            "OBJECT_NAME": "HST (HUBBLE)",
            "NORAD_CAT_ID": 20580,
            "TLE_LINE1": "1 20580U 90037B   26177.59632385  .00006617  00000+0  20803-3 0  9993",
            "TLE_LINE2": "2 20580  28.4732  16.2651 0001399 256.6270 103.4171 15.30851283790014",
        },
        {
            "OBJECT_NAME": "SWIFT",
            "NORAD_CAT_ID": 28485,
            "TLE_LINE1": "1 28485U 04047A   26176.96242316  .00058534  00000+0  47118-3 0  9995",
            "TLE_LINE2": "2 28485  20.5514 117.1679 0001440  63.2059 296.8534 15.69134889188246",
        },
        {
            "OBJECT_NAME": "FERMI (GLAST)",
            "NORAD_CAT_ID": 33053,
            "TLE_LINE1": "1 33053U 08029A   26177.59189692  .00002598  00000+0  90722-4 0  9992",
            "TLE_LINE2": "2 33053  25.5805 139.1753 0008421  78.3295 281.8188 15.23982538997275",
        },
        {
            "OBJECT_NAME": "NOAA 15",
            "NORAD_CAT_ID": 25338,
            "TLE_LINE1": "1 25338U 98030A   26177.72068653  .00000086  00000+0  52866-4 0  9995",
            "TLE_LINE2": "2 25338  98.5063 198.0956 0009474 325.5537  34.5029 14.27149112462654",
        },
        {
            "OBJECT_NAME": "NOAA 18",
            "NORAD_CAT_ID": 28654,
            "TLE_LINE1": "1 28654U 05018A   26177.60582776  .00000043  00000+0  46060-4 0  9999",
            "TLE_LINE2": "2 28654  98.8114 257.1463 0015240 122.3102 237.9549 14.13730891 87640",
        },
        {
            "OBJECT_NAME": "NOAA 19",
            "NORAD_CAT_ID": 33591,
            "TLE_LINE1": "1 33591U 09005A   26177.74794519  .00000024  00000+0  36565-4 0  9998",
            "TLE_LINE2": "2 33591  98.9518 248.6296 0013801   8.0325 352.1066 14.13475554895836",
        },
        {
            "OBJECT_NAME": "METOP-B",
            "NORAD_CAT_ID": 38771,
            "TLE_LINE1": "1 38771U 12049A   26177.69241264  .00000086  00000+0  58999-4 0  9996",
            "TLE_LINE2": "2 38771  98.6500 229.0018 0001640 351.4215   8.6934 14.21441705714618",
        },
        {
            "OBJECT_NAME": "SUOMI NPP",
            "NORAD_CAT_ID": 37849,
            "TLE_LINE1": "1 37849U 11061A   26177.71518426  .00000051  00000+0  45032-4 0  9990",
            "TLE_LINE2": "2 37849  98.7954 118.5262 0000989 338.9691  21.1444 14.19519203759793",
        },
        {
            "OBJECT_NAME": "JPSS-1 (NOAA-20)",
            "NORAD_CAT_ID": 43013,
            "TLE_LINE1": "1 43013U 17073A   26177.72844921  .00000042  00000+0  40828-4 0  9990",
            "TLE_LINE2": "2 43013  98.7772 117.1062 0000629 133.0625 227.0604 14.19513365445820",
        },
        {
            "OBJECT_NAME": "SARAL",
            "NORAD_CAT_ID": 39086,
            "TLE_LINE1": "1 39086U 13009A   26177.74737131  .00000078  00000+0  44617-4 0  9995",
            "TLE_LINE2": "2 39086  98.5557   4.1934 0000709 231.6635 128.4485 14.32858091696970",
        },
        {
            "OBJECT_NAME": "LANDSAT 8",
            "NORAD_CAT_ID": 39084,
            "TLE_LINE1": "1 39084U 13008A   26177.70723183  .00000278  00000+0  71873-4 0  9996",
            "TLE_LINE2": "2 39084  98.2299 247.7293 0001359  93.5528 266.5826 14.57100279699284",
        },
        {
            "OBJECT_NAME": "SENTINEL-1A",
            "NORAD_CAT_ID": 39634,
            "TLE_LINE1": "1 39634U 14016A   26177.76177170  .00000026  00000+0  15185-4 0  9997",
            "TLE_LINE2": "2 39634  98.1780 185.1545 0001392  82.9433 277.1925 14.59200339651419",
        },
        {
            "OBJECT_NAME": "ENVISAT",
            "NORAD_CAT_ID": 27386,
            "TLE_LINE1": "1 27386U 02009A   26177.65729764  .00000061  00000+0  33772-4 0  9998",
            "TLE_LINE2": "2 27386  98.3838 128.7647 0001399  87.1849  85.9028 14.39066758274847",
        },
        {
            "OBJECT_NAME": "TERRA",
            "NORAD_CAT_ID": 25994,
            "TLE_LINE1": "1 25994U 99068A   26177.62404847  .00000349  00000+0  79902-4 0  9995",
            "TLE_LINE2": "2 25994  97.9452 226.7960 0002327 162.1758 358.8950 14.61109889410980",
        },
        {
            "OBJECT_NAME": "AQUA",
            "NORAD_CAT_ID": 27424,
            "TLE_LINE1": "1 27424U 02022A   26177.78218816  .00000715  00000+0  15191-3 0  9991",
            "TLE_LINE2": "2 27424  98.4280 147.2569 0000779  66.6322  50.5612 14.62171443284673",
        },
        {
            "OBJECT_NAME": "AURA",
            "NORAD_CAT_ID": 28376,
            "TLE_LINE1": "1 28376U 04026A   26177.70899602  .00000697  00000+0  15089-3 0  9999",
            "TLE_LINE2": "2 28376  98.3420 134.2412 0001170  83.1850 276.9484 14.61342180167605",
        },
        {
            "OBJECT_NAME": "EWS-G1 (GOES 13)",
            "NORAD_CAT_ID": 29155,
            "TLE_LINE1": "1 29155U 06018A   26177.38047522 -.00000172  00000+0  00000+0 0  9990",
            "TLE_LINE2": "2 29155   4.5569  76.3170 0060408 278.5435  56.2061  0.98789719 43330",
        },
        {
            "OBJECT_NAME": "JASON-3",
            "NORAD_CAT_ID": 41240,
            "TLE_LINE1": "1 41240U 16002A   26177.71147885 -.00000072  00000+0 -38875-4 0  9999",
            "TLE_LINE2": "2 41240  66.0415 105.8124 0008404 272.3956  87.6101 12.87622995488471",
        },
        {
            "OBJECT_NAME": "CRYOSAT 2",
            "NORAD_CAT_ID": 36508,
            "TLE_LINE1": "1 36508U 10013A   26177.73032353  .00000109  00000+0  26305-4 0  9995",
            "TLE_LINE2": "2 36508  92.0360 279.6213 0002131  94.5544 265.5907 14.51902116859468",
        },
        {
            "OBJECT_NAME": "GRACE-FO 1",
            "NORAD_CAT_ID": 43476,
            "TLE_LINE1": "1 43476U 18047A   26177.72357941  .00003787  00000+0  99157-4 0  9994",
            "TLE_LINE2": "2 43476  88.9915 196.6426 0013781  77.6342 282.6454 15.38321682451267",
        },
        {
            "OBJECT_NAME": "GRACE-FO 2",
            "NORAD_CAT_ID": 43477,
            "TLE_LINE1": "1 43477U 18047B   26177.72384495  .00003797  00000+0  99434-4 0  9998",
            "TLE_LINE2": "2 43477  88.9914 196.6425 0013789  77.6867 282.5931 15.38318995451268",
        },
        {
            "OBJECT_NAME": "COSMOS 2404 [GLONASS-M]",
            "NORAD_CAT_ID": 28112,
            "TLE_LINE1": "1 28112U 03056A   26177.16313424 -.00000063  00000+0  00000+0 0  9993",
            "TLE_LINE2": "2 28112  64.2614  61.7653 0050297  69.5943  90.7025  2.13088388175418",
        },
        {
            "OBJECT_NAME": "ATLAS CENTAUR 2",
            "NORAD_CAT_ID": 694,
            "TLE_LINE1": "1 00694U 63047A   26177.75021884  .00000894  00000+0  95647-4 0  9992",
            "TLE_LINE2": "2 00694  30.3571 305.9168 0545915 321.8332  34.4784 14.12534272147051",
        },
        {
            "OBJECT_NAME": "SL-8 R/B",
            "NORAD_CAT_ID": 2802,
            "TLE_LINE1": "1 02802U 67045B   26177.63541725  .00000205  00000+0  64121-4 0  9994",
            "TLE_LINE2": "2 02802  74.0103 144.6120 0063145 126.4589 234.2412 14.45686057104763",
        },
        {
            "OBJECT_NAME": "ONEWEB-0145",
            "NORAD_CAT_ID": 44057,
            "TLE_LINE1": "1 44057U 19010A   26177.67679411 -.00000011  00000+0 -61760-4 0  9992",
            "TLE_LINE2": "2 44057  87.9089 226.9009 0001821  86.3702 273.7637 13.16595164352814",
        },
        {
            "OBJECT_NAME": "STARLINK-2402",
            "NORAD_CAT_ID": 44714,
            "TLE_LINE1": "1 44714U 19074B   26177.72100034  .00037588  00000+0  63753-3 0  9998",
            "TLE_LINE2": "2 44714  53.1512  23.0451 0001908 195.2128 164.8824 15.51162359365690",
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
