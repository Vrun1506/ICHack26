from weatherSubAgent import WeatherSubAgent 
from marketSubAgent import MarketSubAgent
import anthropic

SYSTEM_PROMPT = """You are an expert of farming."""
class Agent:
    def __init__(self, postcode):
        self.weatherAgent = WeatherSubAgent(postcode)
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
        response = self.client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=1000,
            messages=[
                {
                    "role": "user",
                    "content": f"{SYSTEM_PROMPT} Given the following information: {combined_report}, give a brief summary on an optimal strategy that will maximimse profit and harvest for the farmer."
                }
            ]
        )
        return response.content
    
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
    agent = Agent("SE11 5HS")
    print(agent.generate_response())