import pandas as pd
import json
import uuid
import sys
import os
import re

# Ensure the script can import db_connection
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from db_connection import execute_query

EXCEL_PATH = r"g:\My Drive\[ANPHIM] MASTER PLANN\Project Management .xlsx"
PAYEES_MD_PATH = r"g:\My Drive\[ANPHIM] MASTER PLANN\.agents\rules\payees.md"

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

def sync_projects_and_documents():
    print("Syncing Projects and Documents...")
    df_projects = pd.read_excel(EXCEL_PATH, sheet_name='Projects')
    df_docs = pd.read_excel(EXCEL_PATH, sheet_name='Giấy tờ')
    
    # Merge on Project Name to get budget info
    # Some project names might have slight differences, but let's assume they match.
    
    docs_dict = {}
    for _, row in df_docs.iterrows():
        pname = str(clean_value(row.get('Project Name')))
        if pname and pname != "":
            docs_dict[pname] = row
            
    for _, row in df_projects.iterrows():
        pname = str(clean_value(row.get('Project Name')))
        if not pname:
            continue
            
        pid = str(clean_value(row.get('ID')))
        if not pid:
            pid = f"proj_{uuid.uuid4().hex[:8]}"
            
        client = str(clean_value(row.get('Client')))
        status = str(clean_value(row.get('Current Stage')))
        ptype = str(clean_value(row.get('Type')))
        priority = str(clean_value(row.get('Priority')))
        next_action = str(clean_value(row.get('Next Action')))
        due = str(clean_value(row.get('Due')))
        notes = str(clean_value(row.get('Notes')))
        
        doc_row = docs_dict.get(pname, pd.Series(dtype=object))
        
        budget = clean_int(doc_row.get('Tổng cộng', 0))
        received = clean_int(doc_row.get('Thanh toán', 0))
        paymentD1 = clean_int(doc_row.get('Đợt 1', 0))
        paymentD2 = clean_int(doc_row.get('Đợt 2', 0))
        paymentD3 = clean_int(doc_row.get('Đợt 3', 0))
        
        # Insert Project
        execute_query("""
            INSERT INTO projects 
            (id, name, client, status, budget, received, paymentD1, paymentD2, paymentD3, dueDate, nextAction, projectType, notes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            client = EXCLUDED.client,
            status = EXCLUDED.status,
            budget = EXCLUDED.budget,
            received = EXCLUDED.received,
            paymentD1 = EXCLUDED.paymentD1,
            paymentD2 = EXCLUDED.paymentD2,
            paymentD3 = EXCLUDED.paymentD3,
            dueDate = EXCLUDED.dueDate,
            nextAction = EXCLUDED.nextAction,
            projectType = EXCLUDED.projectType,
            notes = EXCLUDED.notes
        """, (pid, pname, client, status, budget, received, paymentD1, paymentD2, paymentD3, due, next_action, ptype, notes))
        
        # Insert Document Checklists
        def has_tick(val):
            v = str(val).lower().strip()
            return v in ['x', 'v', 'true', '1', 'done', 'yes', 'đã có'] or 'x' in v or 'v' in v
            
        quote = has_tick(doc_row.get('Báo giá', ''))
        contract = has_tick(doc_row.get('Hợp đồng', ''))
        vatR1 = has_tick(doc_row.get('VAT R1', ''))
        vatR2 = has_tick(doc_row.get('VAT R2', ''))
        vatR3 = has_tick(doc_row.get('VAT R3', ''))
        liquidation = has_tick(doc_row.get('BBTL', ''))
        
        execute_query("""
            INSERT INTO projectDocuments
            (projectId, projectName, quote, contract, vatR1, vatR2, vatR3, liquidation)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (projectId) DO UPDATE SET
            projectName = EXCLUDED.projectName,
            quote = EXCLUDED.quote,
            contract = EXCLUDED.contract,
            vatR1 = EXCLUDED.vatR1,
            vatR2 = EXCLUDED.vatR2,
            vatR3 = EXCLUDED.vatR3,
            liquidation = EXCLUDED.liquidation
        """, (pid, pname, quote, contract, vatR1, vatR2, vatR3, liquidation))

def sync_expenses():
    print("Syncing Expenses...")
    df_exp = pd.read_excel(EXCEL_PATH, sheet_name='Expense')
    for _, row in df_exp.iterrows():
        date = str(clean_value(row.get('Date')))
        vendor = str(clean_value(row.get('Vendor / Payee')))
        amount = clean_int(row.get('Amount', 0))
        project = str(clean_value(row.get('Project Name')))
        category = str(clean_value(row.get('Expense Category')))
        method = str(clean_value(row.get('Payment Method')))
        desc = str(clean_value(row.get('Description / Note')))
        
        if not date or amount == 0:
            continue
            
        # Create a unique ID to prevent duplicates if run multiple times
        # UUID based on combination of date, vendor, amount
        uid_str = f"{date}_{vendor}_{amount}_{project}".encode('utf-8')
        import hashlib
        eid = "exp_" + hashlib.md5(uid_str).hexdigest()[:12]
        
        execute_query("""
            INSERT INTO expenseTransactions
            (id, date, vendor, amount, project, category, paymentMethod, description)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO NOTHING
        """, (eid, date, vendor, amount, project, category, method, desc))

def sync_incomes():
    print("Syncing Incomes...")
    try:
        df_inc = pd.read_excel(EXCEL_PATH, sheet_name='Income')
        for _, row in df_inc.iterrows():
            date = str(clean_value(row.get('Date')))
            project = str(clean_value(row.get('Project Name')))
            amount = clean_int(row.get('Amount', 0))
            notes = str(clean_value(row.get('Notes', '')))
            
            if not date or amount == 0:
                continue
                
            uid_str = f"{date}_{project}_{amount}".encode('utf-8')
            import hashlib
            iid = "inc_" + hashlib.md5(uid_str).hexdigest()[:12]
            
            execute_query("""
                INSERT INTO incomes
                (id, date, project, amount, notes)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING
            """, (iid, date, project, amount, notes))
    except Exception as e:
        print("Could not sync Incomes, maybe sheet doesn't exist. Error:", e)

def sync_payees():
    print("Syncing Payees from payees.md...")
    try:
        with open(PAYEES_MD_PATH, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Parse markdown table
        lines = content.split('\\n')
        in_table = False
        for line in lines:
            line = line.strip()
            if line.startswith('| Payee |'):
                in_table = True
                continue
            if in_table and line.startswith('| :---'):
                continue
            if in_table and line.startswith('|'):
                parts = [p.strip() for p in line.split('|')]
                if len(parts) >= 6:
                    vendor = parts[1]
                    alias = parts[2]
                    cat = parts[3]
                    proj = parts[4]
                    method = parts[5]
                    
                    if vendor:
                        execute_query("""
                            INSERT INTO payees
                            (vendor, alias, default_category, default_project, default_method)
                            VALUES (%s, %s, %s, %s, %s)
                            ON CONFLICT (vendor) DO UPDATE SET
                            alias = EXCLUDED.alias,
                            default_category = EXCLUDED.default_category,
                            default_project = EXCLUDED.default_project,
                            default_method = EXCLUDED.default_method
                        """, (vendor, alias, cat, proj, method))
            elif in_table and not line:
                in_table = False
    except Exception as e:
        print("Error syncing payees:", e)

def sync_md_files():
    print("Syncing MD files to system_files...")
    md_dirs = [
        r"g:\My Drive\[ANPHIM] MASTER PLANN\.agents",
        r"g:\My Drive\[ANPHIM] MASTER PLANN\.agents\guidelines",
        r"g:\My Drive\[ANPHIM] MASTER PLANN\.agents\rules"
    ]
    
    for d in md_dirs:
        if not os.path.exists(d):
            continue
        for filename in os.listdir(d):
            if filename.endswith(".md"):
                filepath = os.path.join(d, filename)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        content = f.read()
                        
                    execute_query("""
                        INSERT INTO system_files (filename, content)
                        VALUES (%s, %s)
                        ON CONFLICT (filename) DO UPDATE SET
                        content = EXCLUDED.content,
                        last_updated = CURRENT_TIMESTAMP
                    """, (filename, content))
                except Exception as e:
                    print(f"Error reading {filename}: {e}")

if __name__ == "__main__":
    sync_payees()
    sync_md_files()
    sync_projects_and_documents()
    sync_expenses()
    sync_incomes()
    print("All sync completed!")
