from weatherSubAgent import WeatherSubAgent 
from marketSubAgent import MarketSubAgent
import anthropic
from pydantic import BaseModel

class CropAllocation(BaseModel):
    corn: float
    oat: float
    wheat: float
    soybean_meal: float
    soybean_oil: float
    soybean: float
    cocoa: float
    coffee: float
    cotton: float
    sugar:float

SYSTEM_PROMPT = """You are an expert of farming."""
FORMAT = """{"crop_name": acres}"""

class Agent:
    def __init__(self, postcode, acres):
        self.weatherAgent = WeatherSubAgent(postcode)
        self.acres = acres
        self.marketAgent = MarketSubAgent()
        self.client = anthropic.Anthropic()

    def get_weather_report(self):
        return self.weatherAgent.get_strategy_signal()
    
    def get_market_report(self):
        market_report = self.marketAgent.results
        crop_price = ""
        for crop, price in market_report.items():
            crop_price += f"{crop:15} ${price:>10.2f}\n"

        return f"""
        180-Day Futures Prices:\n
        {"=" * 40}\n
        {crop_price}\n
        {"=" * 40}
        """

    def generate_response(self):
        combined_report = self.get_report()
        crop_response = self.client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=1000,
            messages=[
                {
                    "role": "user",
                    "content": f"{SYSTEM_PROMPT} Given the following information: {combined_report}, give a distribution of acres to allocate to each crop in the format: {FORMAT} for the farmer in one harvest cycle. The farmer has a total of {self.acres} acres." 
                }
            ],
            output_config={
                "format": {
                    "type": "json_schema",
                    "schema": anthropic.transform_schema(CropAllocation),
                }
            }
        )
        advice_response = self.client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=1000,
            messages=[
                {
                    "role": "user",
                    "content": f"{SYSTEM_PROMPT} Given the following information: {combined_report}, give the farmer general advice to maximise their harvest and profit, briefly (no more than 6 or 7) in bullet points."
                }
            ]

        )
        return [crop_response.content + advice_response.content]
    
    def get_report(self):
        weather_report = self.get_weather_report()
        market_report = self.get_market_report()
        

        return f"""

        WEATHER REPORT:

        {weather_report}

        MARKET REPORT:

        {market_report}
        
        """


if __name__ == "__main__":
    agent = Agent("SE11 5HS", 13.2)
    print(agent.generate_response())