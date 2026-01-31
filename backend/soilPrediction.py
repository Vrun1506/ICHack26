from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.action_chains import ActionChains

import time
import re

MAP_URL = "https://mapapps2.bgs.ac.uk/ukso/home.html?layers=SPMTexture&extent=-2010931,6035329,1097916,8420164&basemap=light_gray&"

def get_soil_data(postcode: str) -> dict:
    """
    Retrieves soil data (Texture, pH, Soil Moisture) for a given UK postcode
    from the BGS UKSO map application.

    Args:
        postcode (str): The UK postcode to search for.

    Returns:
        dict: A dictionary containing the extracted soil data, or an empty dict
              if data could not be retrieved.
    """

    driver = webdriver.Chrome()

    data = {}

    try:
        driver.get(MAP_URL)



        # # Wait for the page to load, adjust timeout as necessary
        WebDriverWait(driver, 20).until(
            EC.presence_of_element_located((By.ID, "mapviewDiv"))
        )

        print("Page loaded. Attempting to find postcode search input.")

        end_tour_button = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, '//button[text()="End tour"]'))
        )

        end_tour_button.click()

        time.sleep(1)

        ActionChains(driver).send_keys(Keys.ESCAPE).perform()

        print("clicked")

        search_input_locator = (By.ID, "locationTbox")

        search_input = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located(search_input_locator)
        )
        search_input.send_keys(postcode)
        search_input.send_keys(Keys.ENTER)

        print(f"Postcode '{postcode}' entered. Waiting for search results/map update.")

        # Get browser window size
        window_size = driver.get_window_size()
        center_x = window_size['width'] // 2
        center_y = window_size['height'] // 2

        # Move mouse to the center and click
        ActionChains(driver).move_by_offset(center_x, center_y).click().perform()
        # Reset mouse position to 0,0 for relative movement next time if needed
        ActionChains(driver).move_by_offset(-center_x, -center_y).perform()
        info = driver.find_elements(By.CSS_SELECTOR, "td.infoWinFieldValue")
        print(info)
        print(info.text)
        time.sleep(1000)



    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        driver.quit() # Always close the browser
    return data

if __name__ == "__main__":
    test_postcode = "EH9 1SP" # Example postcode
    print(f"Attempting to retrieve soil data for postcode: {test_postcode}")
    soil_data = get_soil_data(test_postcode)
    if soil_data:
        print("Retrieved Soil Data:")
        for key, value in soil_data.items():
            print(f"  {key}: {value}")
    else:
        print("Failed to retrieve soil data.")
        print("Please check the comments in soilPrediction.py regarding WebDriver setup and element selectors.")
