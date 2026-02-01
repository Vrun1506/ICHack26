import requests
import time
from uklookup import lookup_postcode_lat_long

def get_soil_texture(lon, lat, depth="0-5cm"):
    """Query SoilGrids for soil texture components"""
    base_url = "https://rest.isric.org/soilgrids/v2.0/properties/query"

    params = {
        'lon': lon,
        'lat': lat,
        'property': ['clay', 'sand', 'silt'],
        'depth': depth,
        'value': 'mean'
    }

    response = requests.get(base_url, params=params)

    if response.status_code == 200:
        data = response.json()
        properties = data['properties']['layers']

        result = {}
        has_data = False

        for prop in properties:
            name = prop['name']
            mean_val = prop['depths'][0]['values']['mean']

            if mean_val is not None:
                value = mean_val / 10
                result[name] = value
                has_data = True
            else:
                result[name] = None

        return result if has_data else None
    else:
        return None

def classify_soil_texture(clay, sand, silt):
    """
    Classify soil texture based on USDA soil texture triangle
    Percentages should sum to 100
    """
    # Validate input
    total = clay + sand + silt
    if not (99 <= total <= 101):  # Allow small rounding errors
        return "Invalid percentages (must sum to 100)"

    # USDA Soil Texture Classification
    if silt + 1.5 * clay < 15:
        return "Sand"
    elif silt + 1.5 * clay >= 15 and silt + 2 * clay < 30:
        return "Loamy Sand"
    elif (clay >= 7 and clay < 20 and sand > 52 and silt + 2 * clay >= 30) or \
         (clay < 7 and silt < 50 and silt + 2 * clay >= 30):
        return "Sandy Loam"
    elif clay >= 7 and clay < 27 and silt >= 28 and silt < 50 and sand <= 52:
        return "Loam"
    elif (silt >= 50 and clay >= 12 and clay < 27) or \
         (silt >= 50 and silt < 80 and clay < 12):
        return "Silt Loam"
    elif silt >= 80 and clay < 12:
        return "Silt"
    elif clay >= 20 and clay < 35 and silt < 28 and sand > 45:
        return "Sandy Clay Loam"
    elif clay >= 27 and clay < 40 and sand > 20 and sand <= 45:
        return "Clay Loam"
    elif clay >= 27 and clay < 40 and sand <= 20:
        return "Silty Clay Loam"
    elif clay >= 35 and sand > 45:
        return "Sandy Clay"
    elif clay >= 40 and silt >= 40:
        return "Silty Clay"
    elif clay >= 40 and sand <= 45 and silt < 40:
        return "Clay"
    else:
        return "Unclassified"

def get_soil_properties(texture_class):
    """
    Return characteristics for each soil texture type
    """
    properties = {
        "Sand": {
            "drainage": "Excellent",
            "water_retention": "Poor",
            "nutrient_retention": "Poor",
            "workability": "Easy",
            "description": "Fast draining, low fertility, requires frequent irrigation"
        },
        "Loamy Sand": {
            "drainage": "Good",
            "water_retention": "Fair",
            "nutrient_retention": "Fair",
            "workability": "Easy",
            "description": "Better than sand but still needs regular watering"
        },
        "Sandy Loam": {
            "drainage": "Good",
            "water_retention": "Good",
            "nutrient_retention": "Good",
            "workability": "Easy",
            "description": "Great for most crops, warm soil, good drainage"
        },
        "Loam": {
            "drainage": "Good",
            "water_retention": "Good",
            "nutrient_retention": "Excellent",
            "workability": "Easy",
            "description": "Ideal soil! Perfect balance for most plants"
        },
        "Silt Loam": {
            "drainage": "Moderate",
            "water_retention": "Excellent",
            "nutrient_retention": "Excellent",
            "workability": "Moderate",
            "description": "Fertile and moisture-retentive, can compact easily"
        },
        "Silt": {
            "drainage": "Poor",
            "water_retention": "Excellent",
            "nutrient_retention": "Good",
            "workability": "Difficult when wet",
            "description": "Very fertile but prone to compaction and erosion"
        },
        "Sandy Clay Loam": {
            "drainage": "Moderate",
            "water_retention": "Good",
            "nutrient_retention": "Good",
            "workability": "Moderate",
            "description": "Fairly versatile, better drainage than clay loam"
        },
        "Clay Loam": {
            "drainage": "Moderate",
            "water_retention": "Excellent",
            "nutrient_retention": "Excellent",
            "workability": "Difficult",
            "description": "Very fertile, heavy soil, can be hard to work"
        },
        "Silty Clay Loam": {
            "drainage": "Poor",
            "water_retention": "Excellent",
            "nutrient_retention": "Excellent",
            "workability": "Difficult",
            "description": "Rich and moisture-retentive, prone to waterlogging"
        },
        "Sandy Clay": {
            "drainage": "Poor",
            "water_retention": "Good",
            "nutrient_retention": "Good",
            "workability": "Very difficult",
            "description": "Heavy when wet, hard when dry, difficult to manage"
        },
        "Silty Clay": {
            "drainage": "Poor",
            "water_retention": "Excellent",
            "nutrient_retention": "Excellent",
            "workability": "Very difficult",
            "description": "Very heavy, waterlogging issues, hard to cultivate"
        },
        "Clay": {
            "drainage": "Very poor",
            "water_retention": "Excellent",
            "nutrient_retention": "Excellent",
            "workability": "Very difficult",
            "description": "Nutrient-rich but waterlogged, needs drainage improvement"
        }
    }

    return properties.get(texture_class, {
        "drainage": "Unknown",
        "water_retention": "Unknown",
        "nutrient_retention": "Unknown",
        "workability": "Unknown",
        "description": "No data available"
    })

def get_soil_texture_with_fallback(lon, lat, depth="0-5cm", max_attempts=10, initial_radius=0.005, radius_multiplier=1.5):
    """
    Try to get soil data, expanding search radius if initial location has no data

    Args:
        lon: Longitude
        lat: Latitude
        depth: Soil depth layer
        max_attempts: Maximum number of locations to try
        initial_radius: Starting search radius in degrees (~0.005 = 500m)
        radius_multiplier: Factor to multiply radius by on each failure
    """
    # 8 directions around the point
    directions = [
        (0, 0),      # Original location
        (1, 0),      # East
        (-1, 0),     # West
        (0, 1),      # North
        (0, -1),     # South
        (1, 1),      # Northeast
        (-1, -1),    # Southwest
        (1, -1),     # Southeast
        (-1, 1),     # Northwest
    ]

    radius = initial_radius
    attempt = 0

    while attempt < max_attempts:
        for dir_lon, dir_lat in directions:
            if attempt >= max_attempts:
                break

            # Calculate offset coordinates
            lon_offset = dir_lon * radius
            lat_offset = dir_lat * radius

            test_lon = lon + lon_offset
            test_lat = lat + lat_offset

            # Calculate approximate distance in km
            distance_km = ((lon_offset**2 + lat_offset**2)**0.5) * 111

            print(f"Attempt {attempt+1}/{max_attempts}: Radius ~{distance_km:.1f}km, coords ({test_lon:.4f}, {test_lat:.4f})")

            result = get_soil_texture(test_lon, test_lat, depth)

            if result is not None:
                if attempt > 0:
                    print(f"✅ Found data ~{distance_km:.1f}km away from original location")
                else:
                    print(f"✅ Found data at original location")
                return {
                    'soil_data': result,
                    'actual_lon': test_lon,
                    'actual_lat': test_lat,
                    'offset_from_original': attempt > 0,
                    'distance_km': distance_km
                }

            attempt += 1
            time.sleep(0.2)  # Be nice to the API

        # Expand search radius for next iteration
        radius *= radius_multiplier
        print(f"📏 Expanding search radius to ~{radius*111:.1f}km")

    print("❌ No soil data found in surrounding area")
    return None

def get_soil_from_postcode(postcode, depth="0-5cm", max_attempts=10, initial_radius=0.005, radius_multiplier=1.5):
    """
    Convert UK postcode to coordinates and get soil data

    Args:
        postcode: UK postcode
        depth: Soil depth layer (0-5cm, 5-15cm, etc.)
        max_attempts: Maximum search attempts
        initial_radius: Starting search radius in degrees (~0.005 = 500m)
        radius_multiplier: Factor to expand radius on each failure (e.g., 1.5 = 50% larger)
    """
    print(f"Looking up postcode: {postcode}")

    # Convert postcode to lat/long using uklookup
    try:
        location_data = lookup_postcode_lat_long(postcode)

        if location_data is None:
            print(f"❌ Could not find coordinates for postcode: {postcode}")
            return None

        lat = location_data[0]
        lon = location_data[1]

        print(f"📍 Coordinates: {lat:.4f}, {lon:.4f}")

    except Exception as e:
        print(f"❌ Error looking up postcode: {e}")
        return None

    # Get soil data with fallback
    result = get_soil_texture_with_fallback(lon, lat, depth, max_attempts, initial_radius, radius_multiplier)

    if result:
        result['postcode'] = postcode
        result['original_lon'] = lon
        result['original_lat'] = lat

        # Add soil texture classification
        soil_data = result['soil_data']
        texture_class = classify_soil_texture(
            soil_data['clay'],
            soil_data['sand'],
            soil_data['silt']
        )
        result['texture_class'] = texture_class
        result['properties'] = get_soil_properties(texture_class)

    return result

# Test with different postcodes
if __name__ == "__main__":
    # Test 1: Central London (likely urban) - aggressive search
    print("=" * 60)
    print("TEST 1: Buckingham Palace area (aggressive search)")
    result = get_soil_from_postcode(
        "SW1A 1AA",
        max_attempts=15,
        initial_radius=0.005,  # Start at ~500m
        radius_multiplier=2.0  # Double radius each time
    )

    if result:
        print(f"\n📊 Soil Analysis for {result['postcode']}:")
        print(f"\n  Composition:")
        print(f"    Clay: {result['soil_data']['clay']:.1f}%")
        print(f"    Sand: {result['soil_data']['sand']:.1f}%")
        print(f"    Silt: {result['soil_data']['silt']:.1f}%")
        print(f"\n  🏷️  Texture Class: {result['texture_class']}")
        print(f"\n  Characteristics:")
        print(f"    Drainage: {result['properties']['drainage']}")
        print(f"    Water Retention: {result['properties']['water_retention']}")
        print(f"    Nutrient Retention: {result['properties']['nutrient_retention']}")
        print(f"    Workability: {result['properties']['workability']}")
        print(f"\n  📝 {result['properties']['description']}")

        if result['offset_from_original']:
            print(f"\n  ⚠️  Data from {result['distance_km']:.1f}km away")
            print(f"     Location: {result['actual_lon']:.4f}, {result['actual_lat']:.4f}")
    else:
        print("\n❌ Could not find soil data")

    print("\n" + "=" * 60)
    print("TEST 2: Rural area (gentle search)")
    result = get_soil_from_postcode(
        "OX1 1AA",
        max_attempts=10,
        initial_radius=0.003,  # Start at ~300m
        radius_multiplier=1.5  # 50% increase each time
    )

    if result:
        print(f"\n📊 Soil Analysis for {result['postcode']}:")
        print(f"\n  Composition:")
        print(f"    Clay: {result['soil_data']['clay']:.1f}%")
        print(f"    Sand: {result['soil_data']['sand']:.1f}%")
        print(f"    Silt: {result['soil_data']['silt']:.1f}%")
        print(f"\n  🏷️  Texture Class: {result['texture_class']}")
        print(f"\n  Characteristics:")
        print(f"    Drainage: {result['properties']['drainage']}")
        print(f"    Water Retention: {result['properties']['water_retention']}")
        print(f"    Nutrient Retention: {result['properties']['nutrient_retention']}")
        print(f"    Workability: {result['properties']['workability']}")
        print(f"\n  📝 {result['properties']['description']}")

        if result.get('distance_km', 0) > 0:
            print(f"\n  ⚠️  Data from {result['distance_km']:.1f}km away")
    else:
        print("\n❌ Could not find soil data")
