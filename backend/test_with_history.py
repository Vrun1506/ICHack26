# test_improved.py

from datetime import datetime

predictor = ImprovedHybridPredictor()

# Same conditions, different seasons
print("\n🌸 APRIL (should be HIGH/EXTREME):")
result_april = predictor.predict(
    latitude=52.63,
    longitude=1.29,
    temperature=28.5,
    precipitation=0.0,
    soil_moisture=0.15,
    wind_gusts=45.0,
    timestamp=datetime(2024, 4, 15)  # April!
)
print(f"Likelihood: {result_april['likelihood']*100:.1f}%")
print(f"Risk: {result_april['risk_level']}")
print(f"Z-scores: {result_april['z_scores']}")

print("\n☀️ JULY (should be LOW/MODERATE):")
result_july = predictor.predict(
    latitude=52.63,
    longitude=1.29,
    temperature=28.5,  # Same temp
    precipitation=0.0,
    soil_moisture=0.15,
    wind_gusts=45.0,
    timestamp=datetime(2024, 7, 15)  # July
)
print(f"Likelihood: {result_july['likelihood']*100:.1f}%")
print(f"Risk: {result_july['risk_level']}")
print(f"Z-scores: {result_july['z_scores']}")