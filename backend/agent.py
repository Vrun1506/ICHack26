from typing import List, Dict
from pydantic import BaseModel, Field
import anthropic
import json
from weatherSubAgent import WeatherSubAgent 
from marketSubAgent import MarketSubAgent
from soilPrediction import get_soil_from_postcode
from hybrid_predictor import ImprovedHybridPredictor


class FullAgentResponse(BaseModel):
    crop_data: Dict[str, float] = Field(description="Acres allocated to each crop")
    advice: Dict[str, List[str]] = Field(description="Categorized advice points with subheadings as keys")


SYSTEM_PROMPT = """You are a Senior Agronomist and Market Analyst. 
Your goal is to provide data-driven farming strategies based on comprehensive telemetry data.

When providing advice, you must specifically address:
1. Extreme weather likelihood based on the ML predictions and current weather patterns
2. Soil properties (Composition of Clay/Sand/Silt, Drainage, Retention, and Workability)
3. Market futures prices for each crop
4. Weather anomalies detected by the prediction model

Guidelines:
- Keep every advice point succinct, actionable, and meaningful.
- Ensure the crop allocation totals exactly the provided acreage.
- Base crop recommendations on soil suitability, weather risk, and market prices.
- You must output ONLY valid JSON.
- Categorize advice under relevant headings like "Soil Management", "Weather Risk Mitigation", "Market Strategy", "Crop Selection"."""


class Agent:
    def __init__(self, postcode: str, acres: float):
        self.postcode = postcode
        self.acres = acres
        self.client = anthropic.Anthropic()
        
        # Initialize all sub-agents and models
        print(f"Initializing Agent for postcode: {postcode}")
        self.weatherAgent = WeatherSubAgent(postcode)
        self.marketAgent = MarketSubAgent()
        self.extreme_predictor = ImprovedHybridPredictor()
        
        # Get soil data
        print("Fetching soil data...")
        self.soil_data = self._get_soil_data()
        
        # Generate ML telemetry
        self.ml_telemetry = self._generate_ml_telemetry()

    def _get_soil_data(self):
        """Fetch and format soil composition data"""
        try:
            soil_result = get_soil_from_postcode(self.postcode, max_attempts=10)
            
            if soil_result:
                return {
                    'clay': soil_result['soil_data']['clay'],
                    'sand': soil_result['soil_data']['sand'],
                    'silt': soil_result['soil_data']['silt'],
                    'texture_class': soil_result['texture_class'],
                    'drainage': soil_result['properties']['drainage'],
                    'water_retention': soil_result['properties']['water_retention'],
                    'nutrient_retention': soil_result['properties']['nutrient_retention'],
                    'workability': soil_result['properties']['workability'],
                    'description': soil_result['properties']['description']
                }
            else:
                # Fallback default values
                return {
                    'clay': 35.0,
                    'sand': 35.0,
                    'silt': 30.0,
                    'texture_class': 'Clay Loam',
                    'drainage': 'Moderate',
                    'water_retention': 'Good',
                    'nutrient_retention': 'Good',
                    'workability': 'Moderate',
                    'description': 'Soil data unavailable - using regional defaults'
                }
        except Exception as e:
            print(f"Error fetching soil data: {e}")
            return {
                'clay': 35.0,
                'sand': 35.0,
                'silt': 30.0,
                'texture_class': 'Unknown',
                'drainage': 'Unknown',
                'water_retention': 'Unknown',
                'nutrient_retention': 'Unknown',
                'workability': 'Unknown',
                'description': 'Error retrieving soil data'
            }

    def _generate_ml_telemetry(self):
        """Generate comprehensive ML telemetry from weather model predictions"""
        try:
            # Get weather model analysis
            weather_analysis = self.weatherAgent.model.predict_risk_score(self.weatherAgent.dataframe)
            
            if "error" in weather_analysis:
                return self._get_fallback_telemetry()
            
            # Get extreme weather prediction
            lat = self.weatherAgent.lat
            lon = self.weatherAgent.long
            
            # Get current weather conditions from the dataframe
            latest_data = self.weatherAgent.dataframe.tail(1)
            temp = latest_data['temperature_2m'].iloc[0] if 'temperature_2m' in latest_data else 15.0
            precip = latest_data['precipitation'].iloc[0] if 'precipitation' in latest_data else 0.0
            soil_moisture = 0.3  # Default if not available
            wind = latest_data['wind_speed_10m'].iloc[0] if 'wind_speed_10m' in latest_data else 10.0
            
            extreme_pred = self.extreme_predictor.predict(lat, lon, temp, precip, soil_moisture, wind)
            
            # Format telemetry data
            preds = weather_analysis['predictions']
            
            telemetry = {
                'extreme_weather': {
                    'likelihood': extreme_pred['prediction']['likelihood'],
                    'risk_level': extreme_pred['prediction']['risk'],
                    'region': extreme_pred['diagnostics']['region'],
                    'temperature_z_score': extreme_pred['diagnostics']['z_temp']
                },
                'weather_anomalies': {
                    'soil_temp_delta': preds['soil_temperature_0cm']['delta'],
                    'soil_temp_actual': preds['soil_temperature_0cm']['actual'],
                    'soil_temp_predicted': preds['soil_temperature_0cm']['predicted'],
                    'wind_speed_delta': preds['wind_speed_10m']['delta'],
                    'wind_speed_actual': preds['wind_speed_10m']['actual'],
                    'precipitation_prob_actual': preds['precipitation_probability']['actual'],
                    'precipitation_actual': preds['precipitation']['actual'],
                    'cloud_cover_actual': preds['cloud_cover']['actual'],
                    'overall_risk': weather_analysis['risk_level']
                },
                'soil': self.soil_data
            }
            
            return telemetry
            
        except Exception as e:
            print(f"Error generating ML telemetry: {e}")
            return self._get_fallback_telemetry()
    
    def _get_fallback_telemetry(self):
        """Fallback telemetry when ML models fail"""
        return {
            'extreme_weather': {
                'likelihood': '15%',
                'risk_level': 'LOW',
                'region': 'unknown',
                'temperature_z_score': 0.0
            },
            'weather_anomalies': {
                'soil_temp_delta': 0.0,
                'soil_temp_actual': 10.0,
                'soil_temp_predicted': 10.0,
                'wind_speed_delta': 0.0,
                'wind_speed_actual': 12.0,
                'precipitation_prob_actual': 20.0,
                'precipitation_actual': 0.0,
                'cloud_cover_actual': 50.0,
                'overall_risk': 'STABLE'
            },
            'soil': self.soil_data
        }

    def get_weather_report(self):
        """Get formatted weather report from weather sub-agent"""
        return self.weatherAgent.get_strategy_signal()

    def get_market_report(self):
        """Get formatted market futures prices"""
        market_results = self.marketAgent.results
        return "\n".join([f"{crop}: ${price:.2f}" for crop, price in market_results.items()])
    
    def format_telemetry_for_prompt(self):
        """Format ML telemetry data as a clear, structured prompt section"""
        t = self.ml_telemetry
        
        formatted = f"""
=== MACHINE LEARNING TELEMETRY DATA ===

EXTREME WEATHER PREDICTION:
  - Likelihood: {t['extreme_weather']['likelihood']}
  - Risk Classification: {t['extreme_weather']['risk_level']}
  - Regional Model: {t['extreme_weather']['region']}
  - Temperature Z-Score: {t['extreme_weather']['temperature_z_score']}

WEATHER ANOMALY DETECTION:
  - Overall Weather Risk: {t['weather_anomalies']['overall_risk']}
  - Soil Temperature: {t['weather_anomalies']['soil_temp_actual']:.1f}°C (predicted: {t['weather_anomalies']['soil_temp_predicted']:.1f}°C, delta: {t['weather_anomalies']['soil_temp_delta']:.1f}°C)
  - Wind Speed: {t['weather_anomalies']['wind_speed_actual']:.1f} km/h (delta: {t['weather_anomalies']['wind_speed_delta']:.1f} km/h)
  - Precipitation Probability: {t['weather_anomalies']['precipitation_prob_actual']:.0f}%
  - Current Precipitation: {t['weather_anomalies']['precipitation_actual']:.1f} mm
  - Cloud Cover: {t['weather_anomalies']['cloud_cover_actual']:.0f}%

SOIL ANALYSIS:
  - Composition: Clay {t['soil']['clay']:.1f}%, Sand {t['soil']['sand']:.1f}%, Silt {t['soil']['silt']:.1f}%
  - Texture Classification: {t['soil']['texture_class']}
  - Drainage: {t['soil']['drainage']}
  - Water Retention: {t['soil']['water_retention']}
  - Nutrient Retention: {t['soil']['nutrient_retention']}
  - Workability: {t['soil']['workability']}
  - Description: {t['soil']['description']}
"""
        return formatted

    def generate_response(self):
        """Generate structured crop allocation and advice using Claude"""
        
        # Combine all data sources
        combined_report = f"""
{self.format_telemetry_for_prompt()}

=== WEATHER SUB-AGENT REAL-TIME ANALYSIS ===
{self.get_weather_report()}

=== MARKET FUTURES PRICES (180-day forward) ===
{self.get_market_report()}
"""
        
        try:
            response = self.client.messages.create(
                model="claude-sonnet-4-5-20250929",
                max_tokens=2000,
                system=SYSTEM_PROMPT,
                messages=[
                    {
                        "role": "user",
                        "content": f"""Total Available Acres: {self.acres}
Postcode: {self.postcode}

Please analyze the following comprehensive data and provide:
1. Optimal crop allocation across the {self.acres} acres
2. Categorized, actionable farming advice based on the ML predictions, soil analysis, and market conditions

{combined_report}
"""
                    }
                ],
                output_config={
                    "format": {
                        "type": "json_schema",
                        "schema": anthropic.transform_schema(FullAgentResponse),
                    }
                }
            )
            
            return json.loads(response.content[0].text)
            
        except Exception as e:
            print(f"Error in Claude API call: {e}")
            return {
                "error": "Failed to generate response",
                "details": str(e)
            }


if __name__ == "__main__":
    # Test the agent
    agent = Agent("SE11 5HS", 13.2)
    result = agent.generate_response()
    print(json.dumps(result, indent=2))