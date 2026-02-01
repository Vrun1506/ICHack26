
from marketPrediction import MarketModel
TICKER_DICT = {
    "corn": "ZC=F",
    "oat": "ZO=F",
    "wheat": "KE=F",
    "soybean meal": "ZM=F",
    "soybean oil": "ZL=F",
    "soybean": "ZS=F",
    "cocoa": "CC=F",
    "coffee": "KC=F",
    "cotton": "CT=F",
    "sugar": "SB=F"
}

class MarketSubAgent:
    def __init__(self):
        self.model = MarketModel(TICKER_DICT)
        self.results = self.model.get_180day_futures_prices()
      