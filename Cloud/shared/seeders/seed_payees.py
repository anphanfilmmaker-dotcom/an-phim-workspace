import sys
import os
import uuid
from collections import defaultdict, Counter

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from db_connection import execute_query
import openpyxl

if sys.platform.startswith('win'):
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

def seed_payees():
    wb = openpyxl.load_workbook('g:/My Drive/[ANPHIM] MASTER PLANN/Project Management .xlsx', read_only=True)
    sheet = wb['Expense']
    rows = list(sheet.iter_rows(values_only=True))
    
    vendor_cats = defaultdict(list)
    
    # Header: 'Date', 'Vendor / Payee', 'Amount', 'Project Name', 'Expense Category', 'Payment Method', 'Description / Note'
    for r in rows[1:]:
        vendor = str(r[1]).strip() if r[1] else None
        category = str(r[4]).strip() if r[4] else None
        
        if vendor:
            if category and category.lower() != 'none':
                vendor_cats[vendor].append(category)
            else:
                if vendor not in vendor_cats:
                    vendor_cats[vendor] = []
                    
    print(f"Found {len(vendor_cats)} unique vendors.")
    
    for vendor, cats in vendor_cats.items():
        # Find most common category
        if cats:
            most_common_cat = Counter(cats).most_common(1)[0][0]
        else:
            most_common_cat = "Other"
            
        payee_id = f"PAYEE-{uuid.uuid4().hex[:8]}"
        
        query = """
            INSERT INTO payees (id, vendor, default_category)
            VALUES (%s, %s, %s)
            ON CONFLICT (id) DO NOTHING
        """
        execute_query(query, (payee_id, vendor, most_common_cat), fetch=False)
        
    print("Seed payees completed successfully!")

if __name__ == "__main__":
    seed_payees()
