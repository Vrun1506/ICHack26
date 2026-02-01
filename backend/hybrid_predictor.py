import pandas as pd
import numpy as np
import os, json
from datetime import datetime, timedelta
from model_trainer import ExtremeWeatherModel
from anomaly_labeler import AnomalyLabeler
from weather_fetcher import get_nearest_region, WeatherDataFetcher

class ImprovedHybridPredictor:
    def __init__(self, model_dir="models", stats_file="models/seasonal_stats.json"):
        self.model_dir = model_dir
        self.fetcher = WeatherDataFetcher()
        with open(stats_file, 'r') as f:
            self.seasonal_stats = json.load(f)
        
        self.models = {
            reg: ExtremeWeatherModel.load(reg, model_dir)
            for reg in WeatherDataFetcher.UK_REGIONS.keys()
            if os.path.exists(os.path.join(model_dir, reg + ".json"))
        }

    def predict(self, lat, lon, temp, precip, soil, wind, date=None):
        inf_date = date or datetime.now()
        inf_month = str(inf_date.month)
        target_region = get_nearest_region(lat, lon)
        
        region = target_region if target_region in self.models else list(self.models.keys())[0]
        m_stats = self.seasonal_stats[region]
        model = self.models[region]
        

        start_lookback = (inf_date - timedelta(days=4)).strftime('%Y-%m-%d')
        end_lookback = inf_date.strftime('%Y-%m-%d')
        history_df = self.fetcher.fetch_historical_data(lat, lon, start_date_str=start_lookback, end_date_str=end_lookback)
        
        input_data = {'temperature_2m': temp, 'precipitation': precip, 'soil_moisture_0_to_7cm': soil, 'wind_gusts_10m': wind}
        
        for v in ['temperature_2m', 'precipitation', 'soil_moisture_0_to_7cm', 'wind_gusts_10m']:
            v_mean = m_stats[v]['mean'][inf_month]
            v_std = m_stats[v]['std'][inf_month]
            input_data[v + "_z_score"] = (input_data[v] - v_mean) / (v_std + 1e-6)
            
            for lag in [24, 48, 72]:
                lag_val = temp
                if history_df is not None and len(history_df) >= lag:
                    lag_val = history_df[v].iloc[-lag]
                input_data[v + "_lag_" + str(lag) + "h"] = lag_val

        X_inf = pd.DataFrame([input_data])[AnomalyLabeler.FEATURE_COLS]
        prob = float(model.model.predict_proba(X_inf)[:, 1][0])
            
        return {
            "prediction": {"likelihood": str(round(prob * 100, 2)) + "%", "risk": "EXTREME" if prob > 0.85 else "HIGH" if prob > 0.5 else "LOW"},
            "diagnostics": {"region": region, "z_temp": round(input_data['temperature_2m_z_score'], 2)}
        }

if __name__ == "__main__":
    predictor = ImprovedHybridPredictor()
    result = predictor.predict(52.6, 1.2, 20.0, 0, 0.3, 10.0, date=datetime(2026, 2, 1))
    print("Results for East Anglia: " + str(result))