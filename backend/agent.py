from typing import List, Dict
from pydantic import BaseModel, Field
import anthropic
import json
from weatherSubAgent import WeatherSubAgent 
from marketSubAgent import MarketSubAgent
from soilPrediction import get_soil_from_postcode
from hybrid_predictor import ImprovedHybridPredictor


class FullAgentResponse(BaseModel):
    crop_data: Dict[str, float] = Field(
        description="Acres allocated to each crop. MUST include ALL crops: corn, oat, wheat, soybean_meal, soybean_oil, soybean, cocoa, coffee, cotton, sugar. Every crop must have a value, even if 0.0"
    )
    advice: Dict[str, List[str]] = Field(description="Categorized advice points with subheadings as keys")


SYSTEM_PROMPT = """You are a Senior Agronomist and Market Analyst. 
Your goal is to provide data-driven farming strategies based on comprehensive telemetry data.

CRITICAL REQUIREMENTS FOR CROP ALLOCATION:
- You MUST allocate crops across ALL 10 crop types: corn, oat, wheat, soybean_meal, soybean_oil, soybean, cocoa, coffee, cotton, sugar
- Every crop must appear in crop_data, even if allocated 0.0 acres
- Total allocation must equal the provided acreage exactly
- Base allocations on: soil suitability, weather risk, market prices, and extreme weather predictions
- For high-risk scenarios, allocate more to weather-resistant crops but still include all crop types

CRITICAL REQUIREMENTS FOR ADVICE:
- Keep advice GENERIC and applicable to the situation, not specific to individual field sizes
- Do NOT mention specific acreage numbers or plot sizes in advice
- DO include specific telemetry values (temperatures, precipitation, soil conditions, market prices)
- DO include timing recommendations (e.g., "within 2 weeks", "before mid-October")
- Each advice point must be 1-2 concise sentences maximum
- Focus on actionable, forward-looking strategies
- Make recommendations practical and immediately implementable

Guidelines for Advice Categories:
- Categorize under headings like: "Soil Management", "Weather Risk Mitigation", "Market Strategy", "Crop Selection", "Planting Timeline"
- If extreme weather is predicted, include "Emergency Preparedness" with protective measures
- Ensure every recommendation is situation-specific based on the telemetry data provided

Example GOOD advice (generic but specific to conditions):
"Plant winter wheat before mid-October to capitalize on current soil temperature of 11.8°C."
"Install drainage systems within 2 weeks before predicted heavy rainfall begins."
"Lock in forward contracts for cocoa at current $8,450/ton price to hedge against volatility."

Example BAD advice (too specific to acreage):
"Allocate 5.28 acres to cocoa for maximum revenue."
"Plant wheat on the south 40-acre field."
"""


class Agent:
    def __init__(self, postcode: str, acres: float):
        self.postcode = postcode
        self.acres = acres
        self.client = anthropic.Anthropic()
        
        # Define all crops that must be included
        self.all_crops = ['corn', 'oat', 'wheat', 'soybean_meal', 'soybean_oil', 
                          'soybean', 'cocoa', 'coffee', 'cotton', 'sugar']
        
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
                'texture_class': 'Clay Loam',
                'drainage': 'Moderate',
                'water_retention': 'Good',
                'nutrient_retention': 'Good',
                'workability': 'Moderate',
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
            temp = float(latest_data['temperature_2m'].iloc[0]) if 'temperature_2m' in latest_data else 15.0
            precip = float(latest_data['precipitation'].iloc[0]) if 'precipitation' in latest_data else 0.0
            soil_moisture = 0.3  # Default if not available
            wind = float(latest_data['wind_speed_10m'].iloc[0]) if 'wind_speed_10m' in latest_data else 10.0
            
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
            import traceback
            traceback.print_exc()
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
    
    def _get_fallback_response(self):
        """Fallback response when Claude returns empty data"""
        market_prices = self.marketAgent.results
        
        # Create mapping of all crops with market prices
        # If a crop isn't in market results, assign a reasonable default
        crop_price_map = {
            'corn': market_prices.get('corn', 450.0),
            'oat': market_prices.get('oat', 350.0),
            'wheat': market_prices.get('wheat', 600.0),
            'soybean_meal': market_prices.get('soybean_meal', 380.0),
            'soybean_oil': market_prices.get('soybean_oil', 520.0),
            'soybean': market_prices.get('soybean', 1300.0),
            'cocoa': market_prices.get('cocoa', 8000.0),
            'coffee': market_prices.get('coffee', 2500.0),
            'cotton': market_prices.get('cotton', 750.0),
            'sugar': market_prices.get('sugar', 420.0)
        }
        
        # Sort crops by price
        sorted_crops = sorted(crop_price_map.items(), key=lambda x: x[1], reverse=True)
        
        # Allocate percentages based on price ranking and risk
        risk_level = self.ml_telemetry['extreme_weather']['risk_level']
        
        if risk_level in ['HIGH', 'EXTREME']:
            # More conservative allocation for high risk
            percentages = [0.25, 0.20, 0.15, 0.12, 0.10, 0.08, 0.05, 0.03, 0.02, 0.0]
        else:
            # Aggressive allocation for low/moderate risk
            percentages = [0.40, 0.23, 0.15, 0.10, 0.05, 0.04, 0.02, 0.01, 0.0, 0.0]
        
        # Create allocation
        crop_allocation = {}
        for i, (crop, price) in enumerate(sorted_crops):
            crop_allocation[crop] = round(self.acres * percentages[i], 1)
        
        # Adjust for rounding errors
        total_allocated = sum(crop_allocation.values())
        diff = round(self.acres - total_allocated, 1)
        if abs(diff) > 0.01:
            first_crop = sorted_crops[0][0]
            crop_allocation[first_crop] = round(crop_allocation[first_crop] + diff, 1)
        
        # Get telemetry values for advice
        soil_temp = self.ml_telemetry['weather_anomalies']['soil_temp_actual']
        precip_prob = self.ml_telemetry['weather_anomalies']['precipitation_prob_actual']
        risk_likelihood = self.ml_telemetry['extreme_weather']['likelihood']
        drainage = self.soil_data['drainage']
        texture = self.soil_data['texture_class']
        
        # Get top 3 crops for market strategy
        top_crops = sorted_crops[:3]
        
        advice = {
            "Market Strategy": [
                f"Lock in forward contracts for {top_crops[0][0]} at current ${top_crops[0][1]:.2f}/unit price within next 2 weeks to hedge volatility.",
                f"Consider hedging {top_crops[1][0]} and {top_crops[2][0]} positions given favorable futures pricing."
            ],
            "Soil Management": [
                f"Schedule field operations during dry periods to preserve {texture.lower()} soil structure and prevent compaction.",
                f"Install or maintain drainage systems before spring planting given {drainage.lower()} drainage capacity."
            ],
            "Weather Risk Mitigation": [
                f"Monitor {risk_likelihood} extreme weather probability and prepare contingency irrigation systems.",
                f"Select early-maturing varieties given current {soil_temp:.1f}°C soil temperature and {precip_prob:.0f}% precipitation probability."
            ],
            "Planting Timeline": [
                f"Begin field preparation within 1 week when soil reaches optimal moisture for {texture.lower()} workability.",
                f"Target planting window in next 2-3 weeks based on current {soil_temp:.1f}°C soil temperature trends."
            ]
        }
        
        if risk_level in ['HIGH', 'EXTREME']:
            advice["Emergency Preparedness"] = [
                f"Establish windbreaks or protective barriers for vulnerable crops before {risk_likelihood} extreme weather window.",
                "Prepare emergency harvest protocols and storage capacity for early crop retrieval if needed."
            ]
        
        return {
            "crop_data": crop_allocation,
            "advice": advice
        }

    def get_weather_report(self):
        """Get formatted weather report from weather sub-agent"""
        return self.weatherAgent.get_strategy_signal()

    def get_market_report(self):
        """Get formatted market futures prices"""
        market_results = self.marketAgent.results
        # Ensure all crops are represented
        all_prices = {}
        for crop in self.all_crops:
            all_prices[crop] = market_results.get(crop, 'N/A')
        return "\n".join([f"{crop}: ${price:.2f}" if isinstance(price, (int, float)) else f"{crop}: {price}" 
                         for crop, price in all_prices.items()])
    
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
        
        # Get key data points
        t = self.ml_telemetry
        market_prices = self.marketAgent.results
        
        # Create concise summary instead of verbose report
        data_summary = f"""AVAILABLE ACRES: {self.acres}

EXTREME WEATHER: {t['extreme_weather']['likelihood']} likelihood, {t['extreme_weather']['risk_level']} risk

CURRENT CONDITIONS:
- Soil Temp: {t['weather_anomalies']['soil_temp_actual']:.1f}°C
- Precipitation Probability: {t['weather_anomalies']['precipitation_prob_actual']:.0f}%
- Wind: {t['weather_anomalies']['wind_speed_actual']:.1f} km/h
- Weather Risk: {t['weather_anomalies']['overall_risk']}

SOIL: {t['soil']['texture_class']} - Drainage: {t['soil']['drainage']}, Water Retention: {t['soil']['water_retention']}, Workability: {t['soil']['workability']}

MARKET PRICES (180-day futures):
{self.get_market_report()}"""
        
        # First, try to get Claude's response WITHOUT structured output
        try:
            response = self.client.messages.create(
                model="claude-sonnet-4-5-20250929",
                max_tokens=2000,
                system=SYSTEM_PROMPT,
                messages=[
                    {
                        "role": "user",
                        "content": f"""Allocate {self.acres} acres across ALL 10 crops and provide farming advice.

REQUIRED CROPS (all must be included): corn, oat, wheat, soybean_meal, soybean_oil, soybean, cocoa, coffee, cotton, sugar

{data_summary}

You MUST respond with valid JSON in this EXACT format:
{{
  "crop_data": {{
    "corn": 1.5,
    "oat": 1.2,
    "wheat": 2.0,
    "soybean_meal": 0.5,
    "soybean_oil": 0.3,
    "soybean": 1.8,
    "cocoa": 3.0,
    "coffee": 1.5,
    "cotton": 0.9,
    "sugar": 0.5
  }},
  "advice": {{
    "Market Strategy": [
      "Lock in forward contracts for cocoa at current $X price within next 2 weeks.",
      "Monitor soybean futures given favorable pricing trends."
    ],
    "Soil Management": [
      "Schedule operations during dry periods to preserve soil structure.",
      "Install drainage systems before spring planting."
    ],
    "Weather Risk Mitigation": [
      "Prepare for X% extreme weather probability with contingency plans.",
      "Select early-maturing varieties given current soil temperature."
    ]
  }}
}}

CRITICAL RULES:
1. All 10 crops MUST be in crop_data with numeric values
2. Total must equal {self.acres} acres exactly
3. Advice must be GENERIC (no field size mentions) but include specific temps/prices/dates
4. Return ONLY the JSON, no explanation before or after"""
                    }
                ]
            )
            
            # Debug: Print raw response
            raw_response = response.content[0].text
            print("\n" + "="*60)
            print("RAW CLAUDE RESPONSE:")
            print("="*60)
            print(raw_response)
            print("="*60 + "\n")
            
            # Clean the response - remove markdown code blocks if present
            cleaned_response = raw_response.strip()
            if cleaned_response.startswith("```json"):
                cleaned_response = cleaned_response[7:]  # Remove ```json
            if cleaned_response.startswith("```"):
                cleaned_response = cleaned_response[3:]  # Remove ```
            if cleaned_response.endswith("```"):
                cleaned_response = cleaned_response[:-3]  # Remove trailing ```
            cleaned_response = cleaned_response.strip()
            
            # Check if response is literally empty JSON
            if cleaned_response in ['{}', '{"crop_data":{},"advice":{}}', '']:
                print("ERROR: Claude returned literally empty JSON")
                print("This usually means:")
                print("  1. Prompt is too complex/long")
                print("  2. Schema validation failed")
                print("  3. Model refused the request")
                print("Falling back to intelligent response...")
                return self._get_fallback_response()
            
            try:
                parsed_response = json.loads(cleaned_response)
            except json.JSONDecodeError as je:
                print(f"ERROR: Failed to parse JSON: {je}")
                print(f"Response was: {cleaned_response[:200]}")
                print("Using fallback response...")
                return self._get_fallback_response()
            
            # Validate response has required fields with actual data
            crop_data = parsed_response.get('crop_data', {})
            advice = parsed_response.get('advice', {})
            
            # Ensure all crops are present
            crop_data = self._ensure_all_crops(crop_data)
            
            if not crop_data or not advice:
                print("WARNING: Claude returned empty response, using intelligent fallback...")
                return self._get_fallback_response()
            
            # Check if crop_data is actually empty (all zeros or no allocations)
            non_zero_crops = [v for v in crop_data.values() if v > 0]
            if len(non_zero_crops) == 0:
                print("WARNING: All crop allocations are zero, using fallback...")
                return self._get_fallback_response()
            
            # Validate crop allocation sums correctly
            total_allocated = sum(crop_data.values())
            if abs(total_allocated - self.acres) > 0.5:
                print(f"WARNING: Allocation mismatch ({total_allocated} vs {self.acres}), adjusting...")
                crop_data = self._fix_allocation(crop_data)
                parsed_response['crop_data'] = crop_data
            
            print(f"✓ Valid response: {len(non_zero_crops)} non-zero crops, {len(advice)} advice categories")
            return parsed_response
            
        except Exception as e:
            print(f"Error in Claude API call: {e}")
            import traceback
            traceback.print_exc()
            print("Using intelligent fallback response...")
            return self._get_fallback_response()
    
    def _ensure_all_crops(self, crop_data):
        """Ensure all required crops are in the allocation"""
        for crop in self.all_crops:
            if crop not in crop_data:
                crop_data[crop] = 0.0
        return crop_data
    
    def _fix_allocation(self, crop_data):
        """Fix crop allocation to sum to exact acreage"""
        # Ensure all crops are present
        crop_data = self._ensure_all_crops(crop_data)
        
        total = sum(crop_data.values())
        if total == 0:
            return crop_data
        
        # Scale proportionally
        scale_factor = self.acres / total
        fixed_data = {crop: round(acres * scale_factor, 1) for crop, acres in crop_data.items()}
        
        # Handle rounding errors
        total_fixed = sum(fixed_data.values())
        diff = round(self.acres - total_fixed, 1)
        
        if abs(diff) > 0.01:
            # Add difference to largest non-zero allocation
            non_zero_crops = {k: v for k, v in fixed_data.items() if v > 0}
            if non_zero_crops:
                max_crop = max(non_zero_crops, key=non_zero_crops.get)
                fixed_data[max_crop] = round(fixed_data[max_crop] + diff, 1)
        
        return fixed_data


if __name__ == "__main__":
    # Test the agent
    agent = Agent("SE11 5HS", 13.2)
    result = agent.generate_response()
    print(json.dumps(result, indent=2))