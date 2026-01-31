import yfinance as yf
import pandas as pd
import numpy as np
ticker_dict = {
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


class AgFuturesScorer:

    def __init__(self, ticker_dict, period="1y"):
        self.tickers = ticker_dict   # keep dict
        self.period = period

        self.close = None
        self.volume = None
        self.volatility = None

        self.refresh()


    def refresh(self):

        raw = yf.download(
            list(self.tickers.values()),
            period=self.period,
            group_by="ticker",
            threads=True,
            progress=False
        )

        print(type(raw))

        # map crop name -> data
        self.close = pd.DataFrame({
            crop: raw[ticker]["Close"]
            for crop, ticker in self.tickers.items()
        })

        self.volume = pd.DataFrame({
            crop: raw[ticker]["Volume"]
            for crop, ticker in self.tickers.items()
        })

        returns = self.close.pct_change()
        self.volatility = returns.rolling(30).std()


    def _zscore(self, s, window=252):
        return (s - s.rolling(window).mean()) / s.rolling(window).std()


    def compute_score(self, crop):

        price = self.close[crop]
        volume = self.volume[crop]
        vol = self.volatility[crop]

        score = (
            self._zscore(price)
            - self._zscore(vol)
            + 0.7 * self._zscore(volume)
        )

        return score.iloc[-1]


    def compute_scores(self):
        return {
            crop: self.compute_score(crop)
            for crop in self.tickers
        }

my = AgFuturesScorer(ticker_dict)
print(my.compute_scores())