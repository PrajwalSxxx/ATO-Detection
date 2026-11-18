"""Generate 10,000 synthetic login event feature rows for ML training."""
import csv
import math
import os
import random

# All 18 features matching the production pipeline
FEATURE_NAMES = [
    "failed_attempts_15min",
    "failed_attempts_1h",
    "is_new_device",
    "is_new_ip",
    "is_new_ip_subnet",
    "login_hour_sin",
    "login_hour_cos",
    "is_unusual_hour",
    "logins_last_hour",
    "logins_last_24h",
    "seconds_since_last_login_log",
    "geo_distance_km",
    "country_changed",
    "impossible_travel_flag",
    "browser_changed",
    "os_changed",
    "ua_rarity_score",
    "deviation_from_baseline",
]


def generate_normal_sample() -> dict:
    """Generate features for a legitimate user login."""
    # Hour of login: usually between 8 AM and 9 PM
    hour = random.choices(
        population=list(range(24)),
        weights=[1, 1, 1, 1, 1, 2, 5, 8, 12, 14, 15, 14, 13, 14, 15, 12, 10, 8, 6, 4, 3, 2, 1, 1],
        k=1,
    )[0]
    sin_hour = round(math.sin(2 * math.pi * hour / 24), 4)
    cos_hour = round(math.cos(2 * math.pi * hour / 24), 4)
    unusual_hour = int(hour < 6 or hour > 22)

    # Failed attempts: usually 0, occasionally 1
    failed_15m = random.choices([0, 1, 2], weights=[0.95, 0.04, 0.01], k=1)[0]
    failed_1h = failed_15m + random.choices([0, 1], weights=[0.97, 0.03], k=1)[0]

    # Device & IP: usually known
    new_device = random.choices([0, 1], weights=[0.92, 0.08], k=1)[0]
    new_ip = random.choices([0, 1], weights=[0.85, 0.15], k=1)[0]
    new_subnet = random.choices([0, 1], weights=[0.93, 0.07], k=1)[0]

    # Volumes
    logins_1h = random.choices([0, 1, 2, 3], weights=[0.7, 0.22, 0.06, 0.02], k=1)[0]
    logins_24h = logins_1h + random.randint(0, 5)

    # Time since last login: 1 hour to 3 days (log seconds)
    gap_seconds = random.uniform(3600, 259200)
    secs_log = round(math.log1p(gap_seconds), 4)

    # Geo distance: usually 0-50 km
    geo_dist = round(random.expovariate(1.0 / 15.0), 2)
    geo_dist = min(geo_dist, 300)  # Cap normal travel

    country_changed = 0
    impossible_travel = 0

    # Browser & OS changes
    browser_changed = random.choices([0, 1], weights=[0.96, 0.04], k=1)[0]
    os_changed = 0  # Very rare for normal

    ua_rarity = round(random.uniform(0.0, 0.3), 3)
    baseline_dev = round(random.uniform(0.0, 0.35), 3)

    return {
        "failed_attempts_15min": failed_15m,
        "failed_attempts_1h": failed_1h,
        "is_new_device": new_device,
        "is_new_ip": new_ip,
        "is_new_ip_subnet": new_subnet,
        "login_hour_sin": sin_hour,
        "login_hour_cos": cos_hour,
        "is_unusual_hour": unusual_hour,
        "logins_last_hour": logins_1h,
        "logins_last_24h": logins_24h,
        "seconds_since_last_login_log": secs_log,
        "geo_distance_km": geo_dist,
        "country_changed": country_changed,
        "impossible_travel_flag": impossible_travel,
        "browser_changed": browser_changed,
        "os_changed": os_changed,
        "ua_rarity_score": ua_rarity,
        "deviation_from_baseline": baseline_dev,
        "is_ato": 0,
    }


def generate_ato_sample() -> dict:
    """Generate features for an Account Takeover (ATO) attack login."""
    # ATO attacks often happen at off-hours or automated times
    hour = random.randint(0, 23)
    sin_hour = round(math.sin(2 * math.pi * hour / 24), 4)
    cos_hour = round(math.cos(2 * math.pi * hour / 24), 4)
    unusual_hour = random.choices([0, 1], weights=[0.35, 0.65], k=1)[0]

    # High failed attempts (credential stuffing / brute force)
    failed_15m = random.randint(2, 8)
    failed_1h = failed_15m + random.randint(1, 10)

    # Almost always new device and IP
    new_device = random.choices([0, 1], weights=[0.05, 0.95], k=1)[0]
    new_ip = 1
    new_subnet = random.choices([0, 1], weights=[0.1, 0.9], k=1)[0]

    # Rapid volume or burst
    logins_1h = random.randint(3, 15)
    logins_24h = logins_1h + random.randint(5, 30)

    # Time since last legitimate login: either very small (simultaneous) or very long
    gap_seconds = random.choice([random.uniform(60, 600), random.uniform(86400 * 30, 86400 * 90)])
    secs_log = round(math.log1p(gap_seconds), 4)

    # Geo distance: often cross-country or international
    country_changed = random.choices([0, 1], weights=[0.2, 0.8], k=1)[0]
    if country_changed:
        geo_dist = round(random.uniform(2000, 12000), 2)
        impossible_travel = random.choices([0, 1], weights=[0.3, 0.7], k=1)[0]
    else:
        geo_dist = round(random.uniform(500, 3000), 2)
        impossible_travel = random.choices([0, 1], weights=[0.6, 0.4], k=1)[0]

    # Browser & OS changes
    browser_changed = random.choices([0, 1], weights=[0.2, 0.8], k=1)[0]
    os_changed = random.choices([0, 1], weights=[0.3, 0.7], k=1)[0]

    # Rare UA (bot / headless / weird browser)
    ua_rarity = round(random.uniform(0.6, 1.0), 3)
    baseline_dev = round(random.uniform(0.5, 1.0), 3)

    return {
        "failed_attempts_15min": failed_15m,
        "failed_attempts_1h": failed_1h,
        "is_new_device": new_device,
        "is_new_ip": new_ip,
        "is_new_ip_subnet": new_subnet,
        "login_hour_sin": sin_hour,
        "login_hour_cos": cos_hour,
        "is_unusual_hour": unusual_hour,
        "logins_last_hour": logins_1h,
        "logins_last_24h": logins_24h,
        "seconds_since_last_login_log": secs_log,
        "geo_distance_km": geo_dist,
        "country_changed": country_changed,
        "impossible_travel_flag": impossible_travel,
        "browser_changed": browser_changed,
        "os_changed": os_changed,
        "ua_rarity_score": ua_rarity,
        "deviation_from_baseline": baseline_dev,
        "is_ato": 1,
    }


def generate_dataset(output_path: str = "ml-data/sample_login_data.csv", total_rows: int = 10000):
    """Generate 10,000 synthetic rows (93% normal, 7% ATO)."""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    random.seed(1337)

    ato_count = int(total_rows * 0.07)  # 700 ATOs
    normal_count = total_rows - ato_count  # 9300 normal

    rows = []
    for _ in range(normal_count):
        rows.append(generate_normal_sample())
    for _ in range(ato_count):
        rows.append(generate_ato_sample())

    random.shuffle(rows)

    fieldnames = FEATURE_NAMES + ["is_ato"]
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"[generate_sample_data] Generated {len(rows)} samples ({normal_count} normal, {ato_count} ATO) -> {output_path}")


if __name__ == "__main__":
    generate_dataset()
