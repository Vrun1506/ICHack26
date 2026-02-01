from pydantic import BaseModel
from fastapi import FastAPI


class CropPrediction(BaseModel):
    postcode: str
    acreage: float