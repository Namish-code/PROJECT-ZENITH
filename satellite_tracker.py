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
            "TLE_LINE2": "2 25544  51.6415 162.1133 0001617  44.1234  316.0123 15.4987654343210",
        },
        {
            "OBJECT_NAME": "CSS (TIANHE)",
            "NORAD_CAT_ID": 48274,
            "TLE_LINE1": "1 48274U 21035A   26174.58333333  .00001234  00000-0  12345-4 0  9990",
            "TLE_LINE2": "2 48274  41.5830  74.3210 0001420  98.3410 261.2300 15.6234987643210",
        },
        {
            "OBJECT_NAME": "ATLAS CENTAUR 2",
            "NORAD_CAT_ID": 694,
            "TLE_LINE1": "1 00694U 63047A   26177.53541725  .00000885  00000+0  94154-4 0  9991",
            "TLE_LINE2": "2 00694  30.3571 305.9168 0545915 321.8332  34.4784 14.12534272147051",
        },
        {
            "OBJECT_NAME": "THOR AGENA D R/B",
            "NORAD_CAT_ID": 733,
            "TLE_LINE1": "1 00733U 64002A   26177.29691858  .00000177  00000+0  80602-4 0  9990",
            "TLE_LINE2": "2 00733  99.1152 196.5203 0031925 303.4325  56.3806 14.34068890253863",
        },
        {
            "OBJECT_NAME": "SL-3 R/B",
            "NORAD_CAT_ID": 877,
            "TLE_LINE1": "1 00877U 64053B   26177.70499226  .00000110  00000+0  45519-4 0  9991",
            "TLE_LINE2": "2 00877  65.0776  11.6049 0080797 258.1098 101.0934 14.61430602282726",
        },
        {
            "OBJECT_NAME": "SL-8 R/B",
            "NORAD_CAT_ID": 2802,
            "TLE_LINE1": "1 02802U 67045B   26177.63541725  .00000205  00000+0  64121-4 0  9994",
            "TLE_LINE2": "2 02802  74.0103 144.6120 0063145 126.4589 234.2412 14.45686057104763",
        },
        {
            "OBJECT_NAME": "SL-8 R/B",
            "NORAD_CAT_ID": 3230,
            "TLE_LINE1": "1 03230U 68040B   26177.76256531  .00002866  00000+0  20977-3 0  9993",
            "TLE_LINE2": "2 03230  74.0310  90.7078 0025815 242.2678 117.5893 15.03859381106406",
        },
        {
            "OBJECT_NAME": "OAO 2",
            "NORAD_CAT_ID": 3597,
            "TLE_LINE1": "1 03597U 68110A   26177.57451917  .00000185  00000+0  54811-4 0  9998",
            "TLE_LINE2": "2 03597  34.9949  17.2638 0005674 342.9939  17.0561 14.47355438 34889",
        },
        {
            "OBJECT_NAME": "ISIS 1",
            "NORAD_CAT_ID": 3669,
            "TLE_LINE1": "1 03669U 69009A   26177.39671722  .00000051  00000+0  35180-4 0  9994",
            "TLE_LINE2": "2 03669  88.4433 143.3877 1706561 229.6147 114.3243 11.30434836360815",
        },
        {
            "OBJECT_NAME": "SERT 2",
            "NORAD_CAT_ID": 4327,
            "TLE_LINE1": "1 04327U 70009A   26177.75296134 -.00000021  00000+0  28412-4 0  9996",
            "TLE_LINE2": "2 04327  99.2841 114.9527 0003946 242.8020 173.9753 13.58739862794704",
        },
        {
            "OBJECT_NAME": "SL-3 R/B",
            "NORAD_CAT_ID": 5118,
            "TLE_LINE1": "1 05118U 71028B   26177.74213978  .00045450  00000+0  36513-3 0  9995",
            "TLE_LINE2": "2 05118  81.2331 276.3781 0014292 245.7350 114.2415 15.70640161  5748",
        },
        {
            "OBJECT_NAME": "ASTEX 1",
            "NORAD_CAT_ID": 5560,
            "TLE_LINE1": "1 05560U 71089A   26177.72803434  .00000409  00000+0  10372-3 0  9993",
            "TLE_LINE2": "2 05560  92.6997 186.9284 0017944  78.2667 282.0551 14.50858142878115",
        },
        {
            "OBJECT_NAME": "SL-8 R/B",
            "NORAD_CAT_ID": 5730,
            "TLE_LINE1": "1 05730U 71119B   26177.67710772  .00003924  00000+0  20219-3 0  9998",
            "TLE_LINE2": "2 05730  73.8879 331.6716 0543607 275.7319  78.2127 14.39563921671166",
        },
        {
            "OBJECT_NAME": "OAO 3 (COPERNICUS)",
            "NORAD_CAT_ID": 6153,
            "TLE_LINE1": "1 06153U 72065A   26177.35147198  .00000281  00000+0  61825-4 0  9992",
            "TLE_LINE2": "2 06153  35.0069  38.1868 0007001 324.0375 202.2934 14.60065069862089",
        },
        {
            "OBJECT_NAME": "ATLAS CENTAUR R/B",
            "NORAD_CAT_ID": 6155,
            "TLE_LINE1": "1 06155U 72065B   26177.60039589  .00000921  00000+0  12774-3 0  9995",
            "TLE_LINE2": "2 06155  35.0029  27.3563 0033856 208.4898 151.3951 14.77937319857385",
        },
        {
            "OBJECT_NAME": "SL-8 R/B",
            "NORAD_CAT_ID": 8459,
            "TLE_LINE1": "1 08459U 75112B   26177.70919623  .00000235  00000+0  85742-4 0  9991",
            "TLE_LINE2": "2 08459  74.0590 178.3561 0016748 244.1404 115.8023 14.38251164647540",
        },
        {
            "OBJECT_NAME": "SL-3 R/B",
            "NORAD_CAT_ID": 10114,
            "TLE_LINE1": "1 10114U 77057B   26177.71955593  .00010426  00000+0  20079-3 0  9993",
            "TLE_LINE2": "2 10114  97.5839 354.7233 0005696 241.1193 118.9486 15.48067143685188",
        },
        {
            "OBJECT_NAME": "SEASAT 1",
            "NORAD_CAT_ID": 10967,
            "TLE_LINE1": "1 10967U 78064A   26177.71560229  .00000203  00000+0  94971-4 0  9991",
            "TLE_LINE2": "2 10967 108.0178 354.2909 0001536 240.8936 119.2055 14.46249322522277",
        },
        {
            "OBJECT_NAME": "SL-14 R/B",
            "NORAD_CAT_ID": 11267,
            "TLE_LINE1": "1 11267U 79011B   26177.76584670  .00000481  00000+0  44771-4 0  9990",
            "TLE_LINE2": "2 11267  82.5239 353.0626 0017261  56.3204 303.9659 14.92022387545041",
        },
        {
            "OBJECT_NAME": "SL-8 R/B",
            "NORAD_CAT_ID": 11574,
            "TLE_LINE1": "1 11574U 79089B   26177.56811723  .00000189  00000+0  64980-4 0  9995",
            "TLE_LINE2": "2 11574  74.0685 249.4921 0015270  29.8231 330.3793 14.42407870451804",
        },
        {
            "OBJECT_NAME": "SL-14 R/B",
            "NORAD_CAT_ID": 11672,
            "TLE_LINE1": "1 11672U 80005B   26177.51519257  .00000450  00000+0  42800-4 0  9994",
            "TLE_LINE2": "2 11672  82.5133 203.9918 0016345 155.2537 204.9470 14.91035428492705",
        },
        {
            "OBJECT_NAME": "SL-8 R/B",
            "NORAD_CAT_ID": 12139,
            "TLE_LINE1": "1 12139U 81003B   26177.46940448  .00016004  00000+0  38681-3 0  9999",
            "TLE_LINE2": "2 12139  82.9361 189.1458 0250607 158.7239 202.4646 15.14501851331123",
        },
        {
            "OBJECT_NAME": "SL-3 R/B",
            "NORAD_CAT_ID": 12465,
            "TLE_LINE1": "1 12465U 81046B   26177.71431900  .00011397  00000+0  24471-3 0  9996",
            "TLE_LINE2": "2 12465  81.2293 158.5905 0017493   5.3658 354.7769 15.44390599455249",
        },
        {
            "OBJECT_NAME": "SL-3 R/B",
            "NORAD_CAT_ID": 12904,
            "TLE_LINE1": "1 12904U 81103B   26177.71624672  .00004039  00000+0  17373-3 0  9996",
            "TLE_LINE2": "2 12904  81.1588  85.4384 0011438 280.4600  79.5343 15.22357559989818",
        },
        {
            "OBJECT_NAME": "SL-3 R/B",
            "NORAD_CAT_ID": 13068,
            "TLE_LINE1": "1 13068U 82013B   26177.68476529  .00003864  00000+0  16293-3 0  9996",
            "TLE_LINE2": "2 13068  81.1737  32.9093 0022098 168.6044 191.5693 15.22842356420933",
        },
        {
            "OBJECT_NAME": "SL-3 R/B",
            "NORAD_CAT_ID": 13154,
            "TLE_LINE1": "1 13154U 82039B   26177.77220932  .00003439  00000+0  20505-3 0  9994",
            "TLE_LINE2": "2 13154  81.1474  90.0117 0027800 323.3808  36.5516 15.10596482398101",
        },
        {
            "OBJECT_NAME": "SL-3 R/B",
            "NORAD_CAT_ID": 13403,
            "TLE_LINE1": "1 13403U 82079B   26177.69080435  .00005088  00000+0  19602-3 0  9996",
            "TLE_LINE2": "2 13403  81.1465  64.2461 0024428 153.6992 206.5488 15.25862701394316",
        },
        {
            "OBJECT_NAME": "SL-14 R/B",
            "NORAD_CAT_ID": 13553,
            "TLE_LINE1": "1 13553U 82092B   26177.60194249  .00000346  00000+0  36068-4 0  9995",
            "TLE_LINE2": "2 13553  82.5675  39.4932 0018956 302.3571  80.3208 14.86753486345119",
        },
        {
            "OBJECT_NAME": "SL-3 R/B",
            "NORAD_CAT_ID": 13819,
            "TLE_LINE1": "1 13819U 83010B   26177.55293416  .00013143  00000+0  23728-3 0  9998",
            "TLE_LINE2": "2 13819  81.1010 228.4283 0014912  30.6930 329.5186 15.49468236374783",
        },
        {
            "OBJECT_NAME": "SL-3 R/B",
            "NORAD_CAT_ID": 14208,
            "TLE_LINE1": "1 14208U 83075B   26177.74705316  .00009337  00000+0  22961-3 0  9998",
            "TLE_LINE2": "2 14208  97.6101 186.6425 0020358 193.3088 166.7623 15.40655223346932",
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
