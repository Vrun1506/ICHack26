import pandas as pd
import numpy as np
import os
import glob
import json
from tqdm import tqdm

class AnomalyLabeler:
    FEATURE_COLS = [
        'temperature_2m', 'precipitation', 'soil_moisture_0_to_7cm', 'wind_gusts_10m',
        'temperature_2m_lag_24h', 'temperature_2m_lag_48h', 'temperature_2m_lag_72h',
        'precipitation_lag_24h', 'precipitation_lag_48h', 'precipitation_lag_72h',
        'soil_moisture_0_to_7cm_lag_24h', 'soil_moisture_0_to_7cm_lag_48h', 'soil_moisture_0_to_7cm_lag_72h',
        'wind_gusts_10m_lag_24h', 'wind_gusts_10m_lag_48h', 'wind_gusts_10m_lag_72h',
        'temperature_2m_z_score', 'precipitation_z_score', 'soil_moisture_0_to_7cm_z_score', 'wind_gusts_10m_z_score'
    ]

    def __init__(self, z_threshold=2.5):
        self.z_threshold = z_threshold

    def label_extremes(self, df: pd.DataFrame):
        df = df.sort_values('timestamp').copy()
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        df['month'] = df['timestamp'].dt.month
        
        vars_to_process = ['temperature_2m', 'precipitation', 'soil_moisture_0_to_7cm', 'wind_gusts_10m']
        extreme_flags = []
        seasonal_summary = {}

        for v in vars_to_process:
            grouped = df.groupby('month')[v].agg(['mean', 'std']).to_dict()
            seasonal_summary[v] = grouped
            mean_vals = df['month'].map(grouped['mean'])
            std_vals = df['month'].map(grouped['std'])
            
            df[v + "_z_score"] = (df[v] - mean_vals) / (std_vals + 1e-6)
            df[v + "_is_extreme"] = (np.abs(df[v + "_z_score"]) > self.z_threshold).astype(int)
            extreme_flags.append(df[v + "_is_extreme"])
            
            for lag in [24, 48, 72]:
                df[v + "_lag_" + str(lag) + "h"] = df[v].shift(lag)

        df['target'] = np.maximum.reduce(extreme_flags)
        return df.dropna().reset_index(drop=True), seasonal_summary

if __name__ == "__main__":
    labeler = AnomalyLabeler()
    if not os.path.exists("data/labeled"): os.makedirs("data/labeled")
    if not os.path.exists("models"): os.makedirs("models")
    all_stats = {}

    files = glob.glob("data/raw/*.parquet")
    for f in tqdm(files, desc="Labeling Anomalies"):
        name = os.path.basename(f).replace(".parquet", "")
        df_processed, region_stats = labeler.label_extremes(pd.read_parquet(f))
        all_stats[name] = region_stats
        df_processed.to_parquet("data/labeled/" + name + "_labeled.parquet", index=False)

    with open("models/seasonal_stats.json", "w") as jf:
        json.dump(all_stats, jf)