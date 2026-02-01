import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import requests
import time
import os
from tqdm import tqdm

class WeatherDataFetcher:
    BASE_URL = "https://archive-api.open-meteo.com/v1/archive"
    UK_REGIONS = {
        'scotland': (57.0, -4.0), 'northeast': (55.0, -1.5),
        'northwest': (53.5, -2.5), 'yorkshire': (53.8, -1.5),
        'midlands': (52.5, -1.5), 'east_anglia': (52.63, 1.29),
        'southeast': (51.5, 0.0), 'southwest': (50.5, -3.5),
    }
    VARIABLES = ['temperature_2m', 'precipitation', 'soil_moisture_0_to_7cm', 'wind_gusts_10m']
    
    def __init__(self):
        self.session = requests.Session()
    
    def fetch_historical_data(self, latitude, longitude, years=15, location_name="custom", start_date_str=None, end_date_str=None):
        if not start_date_str:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=365 * years)
            start_date_str = start_date.strftime('%Y-%m-%d')
            end_date_str = end_date.strftime('%Y-%m-%d')
            
        params = {
            'latitude': latitude, 'longitude': longitude,
            'start_date': start_date_str,
            'end_date': end_date_str,
            'hourly': ','.join(self.VARIABLES), 'timezone': 'Europe/London'
        }
        
        for attempt in range(5):
            try:
                response = self.session.get(self.BASE_URL, params=params, timeout=120)
                if response.status_code == 429:
                    time.sleep(60 * (attempt + 1))
                    continue
                response.raise_for_status()
                data = response.json()
                df = pd.DataFrame(data['hourly'])
                df['time'] = pd.to_datetime(df['time'])
                df.rename(columns={'time': 'timestamp'}, inplace=True)
                return df
            except Exception:
                time.sleep(5)
        return None

    def save_regional_data(self, output_dir="data/raw"):
        if not os.path.exists(output_dir): os.makedirs(output_dir)
        for name, (lat, lon) in tqdm(self.UK_REGIONS.items(), desc="Downloading Weather Data"):
            df = self.fetch_historical_data(latitude=lat, longitude=lon, location_name=name)
            if df is not None:
                output_path = os.path.join(output_dir, name + ".parquet")
                df.to_parquet(output_path, engine='pyarrow', index=False)
                time.sleep(2)

def get_nearest_region(lat, lon):
    best_region = None
    min_dist = float('inf')
    for name, (r_lat, r_lon) in WeatherDataFetcher.UK_REGIONS.items():
        dist = ((lat - r_lat)**2 + (lon - r_lon)**2)**0.5
        if dist < min_dist:
            min_dist = dist
            best_region = name
    return best_region

if __name__ == "__main__":
    WeatherDataFetcher().save_regional_data()