import pandas as pd
import sys
import os
import hashlib

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from db_connection import execute_query

EXCEL_PATH = r"g:\My Drive\[ANPHIM] MASTER PLANN\Project Management .xlsx"

def clean_value(val, default=""):
    if pd.isna(val):
        return default
    return val

def clean_int(val, default=0):
    if pd.isna(val):
        return default
    try:
        return int(float(val))
    except (ValueError, TypeError):
        return default

print("Fetching projects mapping...")
projects_data = execute_query("SELECT id, name FROM projects", fetch=True)
project_map = {}
if projects_data:
    for p in projects_data:
        project_map[p['name'].strip().lower()] = p['id']

print("Starting to push Expense sheet to DB...")
df_exp = pd.read_excel(EXCEL_PATH, sheet_name='Expense')
count = 0
for _, row in df_exp.iterrows():
    raw_date = row.get('Date')
    if pd.isna(raw_date):
        continue
    try:
        if isinstance(raw_date, (int, float)):
            dt = pd.Timedelta(days=raw_date, unit='d') + pd.Timestamp('1899-12-30')
        else:
            dt = pd.to_datetime(raw_date)
        date = dt.strftime('%Y-%m-%d')
    except:
        date = str(raw_date)
        
    vendor = str(clean_value(row.get('Vendor / Payee')))
    amount = clean_int(row.get('Amount', 0))
    project = str(clean_value(row.get('Project Name')))
    category = str(clean_value(row.get('Expense Category')))
    method = str(clean_value(row.get('Payment Method')))
    desc = str(clean_value(row.get('Description / Note')))
    
    if not date or amount == 0:
        continue
        
    # Lookup projectId
    project_key = project.strip().lower()
    project_id = project_map.get(project_key)
    
    uid_str = f"{date}_{vendor}_{amount}_{project}".encode('utf-8')
    eid = "exp_" + hashlib.md5(uid_str).hexdigest()[:12]
    
    execute_query("""
        INSERT INTO expenseTransactions
        (id, date, vendor, amount, project, projectId, category, paymentMethod, description)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (id) DO UPDATE SET
        vendor = EXCLUDED.vendor,
        amount = EXCLUDED.amount,
        project = EXCLUDED.project,
        projectId = EXCLUDED.projectId,
        category = EXCLUDED.category,
        paymentMethod = EXCLUDED.paymentMethod,
        description = EXCLUDED.description
    """, (eid, date, vendor, amount, project, project_id, category, method, desc))
    count += 1

print(f"Successfully pushed {count} expense records to the database.")
