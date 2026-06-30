import sys
import os
import uuid
import pandas as pd
from collections import defaultdict, Counter

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from db_connection import execute_query

def seed_payees():
    df = pd.read_excel('g:/My Drive/[ANPHIM] MASTER PLANN/Project Management .xlsx', sheet_name='Expense')
    
    vendor_cats = defaultdict(list)
    
    for index, row in df.iterrows():
        vendor = str(row['Vendor / Payee']).strip()
        category = str(row['Expense Category']).strip()
        
        if vendor != 'nan' and vendor != 'None':
            if category != 'nan' and category != 'None':
                vendor_cats[vendor].append(category)
            else:
                if vendor not in vendor_cats:
                    vendor_cats[vendor] = []
                    
    print(f"Found {len(vendor_cats)} unique vendors.")
    
    for i, (vendor, cats) in enumerate(vendor_cats.items()):
        if cats:
            most_common_cat = Counter(cats).most_common(1)[0][0]
        else:
            most_common_cat = "Other"
            
        payee_id = i + 1
        
        query = """
            INSERT INTO payees (id, vendor, default_category)
            VALUES (%s, %s, %s)
            ON CONFLICT (id) DO NOTHING
        """
        execute_query(query, (payee_id, vendor, most_common_cat), fetch=False)
        
    print("Seed payees completed successfully!")

if __name__ == "__main__":
    seed_payees()
