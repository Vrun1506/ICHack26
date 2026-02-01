from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from agent import Agent
from CropRequest import CropPrediction
import json
import traceback

app = FastAPI(title="Agricultural Strategy API")

# Add CORS middleware for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def status():
    """Simple health check for the API."""
    return {
        "status": "Server is running",
        "version": "2.0",
        "features": [
            "ML-powered extreme weather prediction",
            "Soil texture analysis via SoilGrids",
            "Weather anomaly detection",
            "Market futures pricing",
            "AI-driven crop allocation"
        ]
    }


@app.get("/health")
async def health_check():
    """Detailed health check endpoint"""
    return {
        "status": "healthy",
        "models": {
            "weather_prediction": "active",
            "extreme_weather": "active",
            "soil_analysis": "active",
            "market_futures": "active"
        }
    }


@app.post("/predict-crops")
async def predict_crops(request: CropPrediction):
    """
    Main endpoint that receives postcode and acreage, then returns 
    structured crop allocation and farming advice based on:
    - ML weather predictions
    - Extreme weather risk analysis
    - Soil composition and properties
    - Market futures prices
    
    Request body:
    {
        "postcode": "SE11 5HS",
        "acreage": 13.2
    }
    
    Returns:
    {
        "crop_data": {"corn": 5.0, "wheat": 8.2},
        "advice": {
            "Soil Management": ["advice point 1", "advice point 2"],
            "Weather Risk Mitigation": ["advice point 1"],
            ...
        },
        "metadata": {
            "postcode": "SE11 5HS",
            "total_acres": 13.2,
            "ml_telemetry": {...}
        }
    }
    """
    try:
        # Validate inputs
        if request.acreage <= 0:
            raise HTTPException(status_code=400, detail="Acreage must be positive")
        
        if not request.postcode:
            raise HTTPException(status_code=400, detail="Postcode is required")
        
        # Call the main logic function
        result = getCrops(request.postcode, request.acreage)
        
        if "error" in result:
            raise HTTPException(status_code=500, detail=result)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Internal server error: {str(e)}"
        )


def getCrops(postcode: str, acreage: float):
    """
    Core business logic that orchestrates all ML models and generates recommendations.
    
    Args:
        postcode: UK postcode for location
        acreage: Total farmable acres
        
    Returns:
        dict: Structured response with crop allocation and advice
    """
    try:
        print(f"\n{'='*60}")
        print(f"Processing request for {postcode} - {acreage} acres")
        print(f"{'='*60}\n")
        
        # Initialize agent (this triggers all ML model runs)
        agent = Agent(postcode, acreage)
        
        # Generate AI-powered response
        print("\nGenerating AI recommendations...")
        final_response = agent.generate_response()
        
        # Add metadata for frontend
        final_response['metadata'] = {
            'postcode': postcode,
            'total_acres': acreage,
            'ml_telemetry': agent.ml_telemetry,
            'coordinates': {
                'latitude': agent.weatherAgent.lat,
                'longitude': agent.weatherAgent.long
            }
        }
        
        # Verification
        print("\n✅ Successfully generated agricultural strategy")
        print(f"Crops allocated: {list(final_response.get('crop_data', {}).keys())}")
        print(f"Advice categories: {list(final_response.get('advice', {}).keys())}")
        
        return final_response
        
    except Exception as e:
        print(f"\n❌ Error during agent generation: {e}")
        traceback.print_exc()
        
        return {
            "error": "Failed to generate agricultural strategy",
            "details": str(e)
        }


if __name__ == "__main__":
    # Test mode - run a sample prediction
    print("\n" + "="*60)
    print("RUNNING TEST PREDICTION")
    print("="*60 + "\n")
    
    result = getCrops("SE11 5HS", 13.2)
    
    print("\n" + "="*60)
    print("FINAL OUTPUT")
    print("="*60)
    print(json.dumps(result, indent=2))
    
    # Uncomment to run the server
    # uvicorn.run(app, host="0.0.0.0", port=8000)