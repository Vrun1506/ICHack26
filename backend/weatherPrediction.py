# This is the weather prediction model for just regular weather predictions and stuff.

import pandas as pd
import xgboost as xgb
class WeatherModel:
    def __init__(self):
        # We define all the variables we want to monitor for anomalies
        self.targets = [
            'soil_temperature_0cm', 
            'precipitation', 
            'wind_speed_10m', 
            'cloud_cover',
            'wind_direction_10m',
            'precipitation_probability',
            'weather_code',
            'temp_lag_1h'
        ]
        
        # Dictionary to hold a separate model for each target
        self.models = {
            target: xgb.XGBRegressor(
                n_estimators=200,
                learning_rate=0.05,
                max_depth=6,
                subsample=0.8,
                objective='reg:squarederror'
            ) for target in self.targets
        }
        self.is_trained = False

    def engineer_features(self, df):
        df = df.copy()
        df['time'] = pd.to_datetime(df['time'])
        df['hour'] = df['time'].dt.hour
        df['day_of_year'] = df['time'].dt.dayofyear

        # Derived features
        df['temp_lag_1h'] = df['temperature_2m'].shift(1).bfill()
        
        # Rolling average for precipitation context
        df['precip_rolling_24h'] = df['precipitation'].rolling(window=24).mean().bfill()

        return df
    
    def train(self, dataframe):
        df = self.engineer_features(dataframe)
        
        # All potential features available in the dataset
        # (We use the user's desired list + our engineered features)
        all_features_pool = [
            'hour', 'day_of_year', 'temperature_2m', 'precipitation', 
            'wind_speed_10m', 'cloud_cover', 'wind_direction_10m', 
            'precipitation_probability', 'weather_code',
            'temp_lag_1h', 'precip_rolling_24h', 'soil_temperature_0cm'
        ]

        print(f"Starting multi-target training on {len(df)} rows...")
        
        for target in self.targets:
            # 1. Drop rows where THIS specific target is missing
            df_t = df.dropna(subset=[target])
            
            if df_t.empty:
                print(f"Skipping {target}: No valid data found.")
                continue

            # 2. Select Features (X)
            # Remove the target itself and derived features that "leak" the answer
            features = [f for f in all_features_pool if f != target]
            
            # Anti-leakage: if predicting precip, remove rolling precip
            if target == 'precipitation' and 'precip_rolling_24h' in features:
                features.remove('precip_rolling_24h')
            # Anti-leakage: if predicting lag, remove current temp (optional, but good practice)
            if target == 'temp_lag_1h' and 'temperature_2m' in features:
                features.remove('temperature_2m')

            x = df_t[features].fillna(0)
            y = df_t[target]
            
            # 3. Fit the model
            self.models[target].fit(x, y)
        
        self.is_trained = True
        return True

    def predict_risk_score(self, current_data):
        if not self.is_trained:
            return {"error": "Model not trained (Insufficient Data)"}
        
        df = self.engineer_features(pd.DataFrame(current_data))
        
        # We need the most recent valid row for evaluation
        # For a hackathon, we look at the last row of the fetched data
        if df.empty:
            return {"error": "No data available"}
            
        # We take the last row. In a live scenario, this is "Now".
        # We try to fill NaNs with 0 only if strictly necessary, 
        # but for 'actual' values, we want the real data or None.
        df_now = df.tail(1)
        
        results = {}
        all_features_pool = [
            'hour', 'day_of_year', 'temperature_2m', 'precipitation', 
            'wind_speed_10m', 'cloud_cover', 'wind_direction_10m', 
            'precipitation_probability', 'weather_code',
            'temp_lag_1h', 'precip_rolling_24h', 'soil_temperature_0cm'
        ]

        for target in self.targets:
            # Prepare X features (excluding the target)
            features = [f for f in all_features_pool if f != target]
            if target == 'precipitation' and 'precip_rolling_24h' in features:
                features.remove('precip_rolling_24h')
            if target == 'temp_lag_1h' and 'temperature_2m' in features:
                features.remove('temperature_2m')

            x_now = df_now[features].fillna(0)
            
            # Prediction
            try:
                pred_val = float(self.models[target].predict(x_now)[0])
            except Exception:
                pred_val = 0.0

            # Post-processing for specific types
            if target == 'weather_code':
                pred_val = round(pred_val) # Codes are integers
            elif target == 'precipitation_probability':
                pred_val = max(0.0, min(100.0, pred_val)) # Clamp between 0-100

            # Actual Value
            actual_val = df_now[target].iloc[0]
            if pd.isna(actual_val):
                actual_val = 0.0 # Fallback if API returned null for this hour
            else:
                actual_val = float(actual_val)

            delta = actual_val - pred_val
            
            results[target] = {
                "predicted": round(pred_val, 2),
                "actual": round(actual_val, 2),
                "delta": round(delta, 2)
            }

        soil_risk = abs(results['soil_temperature_0cm']['delta']) > 5.0
        wind_risk = results['wind_speed_10m']['delta'] > 10.0 
        
        return {
            "predictions": results,
            "risk_level": "CRITICAL" if (soil_risk or wind_risk) else "STABLE",
            # Flattened keys for easy access in your main agent
            "predicted_soil_temp": results['soil_temperature_0cm']['predicted'],
            "actual_soil_temp": results['soil_temperature_0cm']['actual'],
            "anomaly_delta": results['soil_temperature_0cm']['delta']
        }