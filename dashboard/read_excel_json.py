import pandas as pd
import json
import hashlib

EXCEL_PATH = r"g:\My Drive\[ANPHIM] MASTER PLANN\Project Management .xlsx"

def clean_value(val, default=""):
    if pd.isna(val): return default
    return str(val).strip()

def clean_int(val, default=0):
    if pd.isna(val): return default
    try: return int(float(val))
    except: return default

df_exp = pd.read_excel(EXCEL_PATH, sheet_name='Expense')
results = []
for _, row in df_exp.iterrows():
    raw_date = row.get('Date')
    if pd.isna(raw_date): continue
    try:
        if isinstance(raw_date, (int, float)):
            dt = pd.Timedelta(days=raw_date, unit='d') + pd.Timestamp('1899-12-30')
        else:
            dt = pd.to_datetime(raw_date)
        date = dt.strftime('%Y-%m-%d')
    except:
        date = str(raw_date)
        
    vendor = clean_value(row.get('Vendor / Payee'))
    amount = clean_int(row.get('Amount', 0))
    project = clean_value(row.get('Project Name'))
    category = clean_value(row.get('Expense Category'))
    method = clean_value(row.get('Payment Method'))
    desc = clean_value(row.get('Description / Note'))
    
    if not date or amount == 0:
        continue
        
    uid_str = f"{date}_{vendor}_{amount}_{project}".encode('utf-8')
    eid = "exp_" + hashlib.md5(uid_str).hexdigest()[:12]
    
    results.append({
        "id": eid, "date": date, "vendor": vendor, "amount": amount,
        "project": project, "category": category, "paymentMethod": method, "description": desc
    })

print(json.dumps(results))
