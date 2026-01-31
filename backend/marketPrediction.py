import yfinance as yf
import pandas as pd
import warnings
warnings.filterwarnings('ignore')

# Futures tickers
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

def get_180day_futures_prices(period="5y"):
    """
    Calculate 180-day forward prices for all crops based on historical data.
    
    Returns:
        dict: {crop_name: forward_price_180days}
    """
    # Download historical data
    print("Downloading historical data...")
    raw = yf.download(
        list(TICKER_DICT.values()),
        period=period,
        group_by="ticker",
        threads=True,
        progress=False
    )
    
    # Extract close prices
    close_prices = pd.DataFrame({
        crop: raw[ticker]["Close"].values
        for crop, ticker in TICKER_DICT.items()
    }, index=raw.index)
    
    # Calculate 180-day empirical forward premiums
    horizon = 180
    results = {}
    
    for crop in close_prices.columns:
        prices = close_prices[crop]
        current_price = prices.iloc[-1]
        
        # Calculate historical premium
        future_price = prices.shift(-horizon)
        premium = (future_price / prices) - 1
        avg_premium = premium.mean()
        
        # Apply to current price
        forward_price = current_price * (1 + avg_premium)
        results[crop] = round(forward_price, 2)
    
    return results


if __name__ == "__main__":
    # Get 180-day futures prices
    futures_prices = get_180day_futures_prices()
    
    print("\n180-Day Futures Prices:")
    print("=" * 40)
    for crop, price in futures_prices.items():
        print(f"{crop:15} ${price:>10.2f}")
    print("=" * 40)
    print(f"\nOutput as dictionary:")
    print(futures_prices)
