

import os
import pickle
import numpy  as np
import pandas as pd
from typing import Union


BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "models", "rf_duration_model.pkl")

CATEGORICAL_FTS = ["case_type", "priority"]
NUMERIC_FTS     = ["num_parties", "judge_idx"]
ALL_FEATURES    = CATEGORICAL_FTS + NUMERIC_FTS

JUDGE_IDS = ["J001", "J002", "J003", "J004", "J005", "J006", "J007", "J008"]
JUDGE_IDX = {jid: i for i, jid in enumerate(JUDGE_IDS)}


class DurationPredictor:
    """
    Loads and wraps the trained scikit-learn Random Forest pipeline.
    Thread-safe for concurrent FastAPI requests (model is read-only after load).
    """

    def __init__(self, model_path: str = MODEL_PATH):
        if not os.path.exists(model_path):
            raise FileNotFoundError(
                f"Trained model not found at: {model_path}\n"
                "  Run  python train_model.py  to train and serialize the model."
            )
        with open(model_path, "rb") as f:
            self._pipeline = pickle.load(f)
        print(f"[DurationPredictor] Model loaded from {model_path}")


    def predict(
        self,
        case_type:  str,
        num_parties: int,
        priority:   str,
        judge_id:   str,
    ) -> int:
        """
        Predict hearing duration in minutes.

        Parameters
        ----------
        case_type   : e.g. "Civil", "Criminal", "Family" …
        num_parties : number of parties involved
        priority    : "High" | "Medium" | "Low"
        judge_id    : e.g. "J001"

        Returns
        -------
        Predicted duration in minutes (integer, clipped to [10, 480]).
        """
        judge_idx = JUDGE_IDX.get(judge_id, 0)

        row = pd.DataFrame([{
            "case_type":  case_type,
            "priority":   priority,
            "num_parties": num_parties,
            "judge_idx":  judge_idx,
        }], columns=ALL_FEATURES)

        raw_pred = self._pipeline.predict(row)[0]
        return int(np.clip(round(raw_pred), 10, 480))


    def predict_batch(self, cases: list[dict]) -> list[int]:
        """
        Predict durations for a list of case dicts.
        Each dict must contain: case_type, num_parties, priority, judge_id.
        """
        rows = []
        for c in cases:
            rows.append({
                "case_type":  c["case_type"],
                "priority":   c["priority"],
                "num_parties": c["num_parties"],
                "judge_idx":  JUDGE_IDX.get(c["judge_id"], 0),
            })
        df = pd.DataFrame(rows, columns=ALL_FEATURES)
        raw = self._pipeline.predict(df)
        return [int(np.clip(round(v), 10, 480)) for v in raw]


    def feature_importance(self) -> dict:
        rf   = self._pipeline.named_steps["regressor"]
        imps = rf.feature_importances_
        return dict(zip(ALL_FEATURES, [round(float(v), 4) for v in imps]))


if __name__ == "__main__":
    predictor = DurationPredictor()

    samples = [
        ("Civil",         3, "High",   "J001"),
        ("Criminal",      5, "High",   "J002"),
        ("Family",        2, "Medium", "J003"),
        ("Commercial",    8, "Medium", "J004"),
        ("Constitutional",10, "High",  "J006"),
        ("Land",          4, "Low",    "J008"),
        ("Labour",        2, "Low",    "J005"),
    ]

    print("\n  Predictions:")
    print(f"  {'Case Type':<16} {'Parties':>8} {'Priority':<10} {'Judge':<6} {'Predicted Dur':>16}")
    print(f"  {'-'*16} {'-'*8} {'-'*10} {'-'*6} {'-'*16}")
    for ct, np_, pri, jid in samples:
        d = predictor.predict(ct, np_, pri, jid)
        print(f"  {ct:<16} {np_:>8} {pri:<10} {jid:<6} {d:>14} mins")

    print(f"\n  Feature importance: {predictor.feature_importance()}")
