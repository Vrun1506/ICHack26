import yfinance as yf
import pandas as pd
import numpy as np

# Futures tickers
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
        self.tickers = ticker_dict
        self.period = period

        self.close = None
        self.volume = None
        self.volatility = None

        self.refresh()

    def refresh(self):
        """Download historical price & volume data and compute volatility."""
        raw = yf.download(
            list(self.tickers.values()),
            period=self.period,
            group_by="ticker",
            threads=True,
            progress=False
        )

        # Map crop -> close prices
        self.close = pd.DataFrame({
            crop: raw[ticker]["Close"].values
            for crop, ticker in self.tickers.items()
        })

        # Map crop -> volume
        self.volume = pd.DataFrame({
            crop: raw[ticker]["Volume"].values
            for crop, ticker in self.tickers.items()
        })

        # Compute daily returns
        returns = self.close.pct_change()
        returns.iloc[0] = 0  # set first row to 0
        # Compute volatility as standard deviation of returns per crop
        self.volatility = returns.std()

    @staticmethod
    def compute_z_score(series):
        """Compute z-score of a pandas Series."""
        return (series - series.mean()) / series.std()

    def compute_scores(self):
        """
        Compute final scores for all crops with cross-crop normalization:
        - Price: latest price compared to all crops
        - Volume: latest volume compared to all crops
        - Volatility: overall volatility compared to all crops
        """
        # Latest price and volume for all crops
        price_latest = self.close.iloc[-1]
        volume_latest = self.volume.iloc[-1]
        vol_latest = self.volatility

        # Compute z-scores across crops
        price_z = (price_latest - price_latest.mean()) / price_latest.std()
        volume_z = (volume_latest - volume_latest.mean()) / volume_latest.std()
        vol_z = (vol_latest - vol_latest.mean()) / vol_latest.std()

        # Weighted combination: higher score = more attractive crop
        scores = 0.4 * price_z - 0.3 * vol_z + 0.3 * volume_z

        return scores.to_dict()


# --------------------
# Example usage
# --------------------
my = AgFuturesScorer(ticker_dict)
scores = my.compute_scores()
print(scores)
