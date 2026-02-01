from weatherPrediction import WeatherModel
import numpy as np
import pandas as pd
import requests
import pgeocode


class WeatherSubAgent:
    def __init__(self, postcode, country_code="gb"):
        self.model = WeatherModel()
        self.postcode = postcode
        self.country_code = country_code

        # 1. Get Coordinates
        self.nomi = pgeocode.Nominatim(country_code)
        self.location = self.nomi.query_postal_code(postcode)
        self.lat = self.location.latitude
        self.long = self.location.longitude

        if np.isnan(self.lat):
            raise ValueError(f"Invalid Postcode: {postcode}")

        # 2. Fetch Data & Train
        print(f"Fetching weather data for {postcode} ({self.lat}, {self.long})...")
        raw_data = self.fetch_data()
        
        if raw_data and "hourly" in raw_data:
            self.dataframe = pd.DataFrame(raw_data["hourly"])
            # Train the model immediately
            print(self.dataframe.tail(200))
            success = self.model.train(self.dataframe)
            if not success:
                print("WARNING: Model training failed due to empty data.")
        else:
            raise ValueError("Failed to fetch weather data. Check API connection.")

    def fetch_data(self):
        url = "https://api.open-meteo.com/v1/forecast"
        params = {
            "latitude": self.lat,
            "longitude": self.long,
            "past_days": 92,    # Get last 3 months of history for training
            "forecast_days": 2, # Get today's forecast
            "hourly": ["temperature_2m", "precipitation", "soil_temperature_0cm", 
                       "wind_speed_10m", "cloud_cover", "wind_direction_10m", "precipitation_probability", "weather_code"],
            "timezone": "auto",
        }
        try:
            response = requests.get(url, params=params)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"API Request Error: {e}")
            return None

    def get_strategy_signal(self):
        analysis = self.model.predict_risk_score(self.dataframe)
        
        if "error" in analysis:
            return f"Error: {analysis['error']}"
        
        preds = analysis['predictions']
        return f"""
        WEATHER_SUB_AGENT_REPORT ({self.postcode}):
        Risk Level: {analysis['risk_level']}
        
        ------------------------------------------
        | Metric          | Actual | Pred | Delta |
        |-----------------|--------|------|-------|
        | Soil Temp (°C)  | {preds['soil_temperature_0cm']['actual']:>6} | {preds['soil_temperature_0cm']['predicted']:>4} | {preds['soil_temperature_0cm']['delta']:>5} |
        | Wind (km/h)     | {preds['wind_speed_10m']['actual']:>6} | {preds['wind_speed_10m']['predicted']:>4} | {preds['wind_speed_10m']['delta']:>5} |
        | Precip (%)      | {preds['precipitation_probability']['actual']:>6} | {preds['precipitation_probability']['predicted']:>4} | {preds['precipitation_probability']['delta']:>5} |
        | Precip (mm)     | {preds['precipitation']['actual']:>6} | {preds['precipitation']['predicted']:>4} | {preds['precipitation']['delta']:>5} |
        | Cloud Cover (%) | {preds['cloud_cover']['actual']:>6} | {preds['cloud_cover']['predicted']:>4} | {preds['cloud_cover']['delta']:>5} |
        ------------------------------------------
        """

if __name__ == "__main__":
    try:
        weather_agent = WeatherSubAgent(postcode="SW11 3ND")
        print(weather_agent.get_strategy_signal())
    except Exception as e:
        print(f"Critical Error: {e}")