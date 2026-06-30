import pandas as pd
import sys

EXCEL_PATH = r"g:\My Drive\[ANPHIM] MASTER PLANN\Project Management .xlsx"

try:
    df = pd.read_excel(EXCEL_PATH, sheet_name='Expense', nrows=5)
    print(df.columns.tolist())
    print("Success")
except Exception as e:
    print(e)
