import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.model_selection import train_test_split
import os, glob
from tqdm.contrib.concurrent import process_map
from anomaly_labeler import AnomalyLabeler

class ExtremeWeatherModel:
    def __init__(self, name="model"):
        self.name = name
        self.model = None

    def train(self, X, y):
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
        pos_weight = np.sqrt((y == 0).sum() / (y == 1).sum())
        self.model = xgb.XGBClassifier(max_depth=4, learning_rate=0.05, n_estimators=150, scale_pos_weight=pos_weight, tree_method='hist')
        self.model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)

    def save(self, folder="models"):
        if not os.path.exists(folder): os.makedirs(folder)
        self.model.save_model(os.path.join(folder, self.name + ".json"))

    @classmethod
    def load(cls, name, folder="models"):
        inst = cls(name)
        inst.model = xgb.XGBClassifier()
        inst.model.load_model(os.path.join(folder, name + ".json"))
        return inst

def train_single_region(file_path):
    region_name = os.path.basename(file_path).replace("_labeled.parquet", "")
    df = pd.read_parquet(file_path)
    X = df[AnomalyLabeler.FEATURE_COLS]
    y = df['target']
    m = ExtremeWeatherModel(region_name)
    m.train(X, y)
    m.save()
    return region_name

if __name__ == "__main__":
    files = glob.glob("data/labeled/*.parquet")
    results = process_map(train_single_region, files, max_workers=os.cpu_count(), desc="Training Regional Models")