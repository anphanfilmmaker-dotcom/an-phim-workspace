import sys
import os

# Ensure the script can import db_connection
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from db_connection import get_connection

def init_schema():
    conn = get_connection()
    if not conn:
        print("Failed to connect to database.")
        return
        
    try:
        with conn.cursor() as cur:
            print("Dropping existing tables if they exist...")
            cur.execute("""
                DROP TABLE IF EXISTS projectDocuments CASCADE;
                DROP TABLE IF EXISTS actions CASCADE;
                DROP TABLE IF EXISTS schedule CASCADE;
                DROP TABLE IF EXISTS expenseTransactions CASCADE;
                DROP TABLE IF EXISTS incomes CASCADE;
                DROP TABLE IF EXISTS projects CASCADE;
                DROP TABLE IF EXISTS clients CASCADE;
                DROP TABLE IF EXISTS system_files CASCADE;
                DROP TABLE IF EXISTS payees CASCADE;
            """)
            
            print("Creating table: clients")
            cur.execute("""
                CREATE TABLE clients (
                    id VARCHAR(255) PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    tax_id VARCHAR(50),
                    address TEXT,
                    rep_name VARCHAR(100),
                    rep_role VARCHAR(100),
                    payment_habits TEXT,
                    notes TEXT
                )
            """)

            print("Creating table: documents")
            cur.execute("""
                CREATE TABLE documents (
                    id VARCHAR(255) PRIMARY KEY,
                    project_id VARCHAR(255) REFERENCES projects(id) ON DELETE CASCADE,
                    doc_type VARCHAR(50),
                    project_type VARCHAR(50),
                    summary TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            print("Creating table: chat_history")
            cur.execute("""
                CREATE TABLE IF NOT EXISTS chat_history (
                    id SERIAL PRIMARY KEY,
                    agent_id VARCHAR(50) NOT NULL,
                    role VARCHAR(20) NOT NULL,
                    content TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            print("Creating table: projects")
            cur.execute("""
                CREATE TABLE projects (
                    id VARCHAR(255) PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    client VARCHAR(255),
                    client_id VARCHAR(255) REFERENCES clients(id) ON DELETE SET NULL,
                    status VARCHAR(50),
                    budget BIGINT DEFAULT 0,
                    received BIGINT DEFAULT 0,
                    paymentD1 BIGINT DEFAULT 0,
                    paymentD2 BIGINT DEFAULT 0,
                    paymentD3 BIGINT DEFAULT 0,
                    phase1_percent INT DEFAULT 0,
                    phase1_amount BIGINT DEFAULT 0,
                    phase2_percent INT DEFAULT 0,
                    phase2_amount BIGINT DEFAULT 0,
                    phase3_percent INT DEFAULT 0,
                    phase3_amount BIGINT DEFAULT 0,
                    dueDate VARCHAR(50),
                    nextAction VARCHAR(255),
                    nextActionDue VARCHAR(50),
                    projectType VARCHAR(50),
                    paymentPhase VARCHAR(50),
                    paymentPhaseProgress INT DEFAULT 0,
                    thumbnailUrl TEXT,
                    notes TEXT,
                    contract_notes TEXT,
                    milestones JSONB
                )
            """)
            
            print("Creating table: projectDocuments")
            cur.execute("""
                CREATE TABLE projectDocuments (
                    projectId VARCHAR(255) PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
                    projectName VARCHAR(255),
                    quote BOOLEAN DEFAULT FALSE,
                    quote_link TEXT,
                    contract BOOLEAN DEFAULT FALSE,
                    contract_link TEXT,
                    vatR1 BOOLEAN DEFAULT FALSE,
                    vatR2 BOOLEAN DEFAULT FALSE,
                    vatR3 BOOLEAN DEFAULT FALSE,
                    liquidation BOOLEAN DEFAULT FALSE,
                    liquidation_link TEXT,
                    folder_link TEXT,
                    overallStatus VARCHAR(50)
                )
            """)
            
            print("Creating table: actions")
            cur.execute("""
                CREATE TABLE actions (
                    id VARCHAR(255) PRIMARY KEY,
                    priorityOrder INT DEFAULT 99,
                    title TEXT NOT NULL,
                    project VARCHAR(255),
                    projectId VARCHAR(255) REFERENCES projects(id) ON DELETE SET NULL,
                    priorityLevel VARCHAR(20),
                    suggestedAgent VARCHAR(50),
                    status VARCHAR(50) DEFAULT 'Pending',
                    notes TEXT,
                    category VARCHAR(50)
                )
            """)
            
            print("Creating table: schedule")
            cur.execute("""
                CREATE TABLE schedule (
                    id VARCHAR(255) PRIMARY KEY,
                    title VARCHAR(255) NOT NULL,
                    description TEXT,
                    startTime VARCHAR(50),
                    endTime VARCHAR(50),
                    date VARCHAR(50),
                    category VARCHAR(50),
                    priority VARCHAR(20),
                    status VARCHAR(50) DEFAULT 'todo',
                    owner VARCHAR(100),
                    agent VARCHAR(100),
                    projectId VARCHAR(255) REFERENCES projects(id) ON DELETE CASCADE
                )
            """)
            
            print("Creating table: expenseTransactions")
            cur.execute("""
                CREATE TABLE expenseTransactions (
                    id VARCHAR(255) PRIMARY KEY,
                    date VARCHAR(50),
                    category VARCHAR(100),
                    project VARCHAR(255),
                    projectId VARCHAR(255) REFERENCES projects(id) ON DELETE SET NULL,
                    description TEXT,
                    vendor VARCHAR(255),
                    paymentMethod VARCHAR(50),
                    amount BIGINT DEFAULT 0
                )
            """)
            
            print("Creating table: incomes")
            cur.execute("""
                CREATE TABLE incomes (
                    id VARCHAR(255) PRIMARY KEY,
                    date VARCHAR(50),
                    project VARCHAR(255),
                    projectId VARCHAR(255) REFERENCES projects(id) ON DELETE SET NULL,
                    amount BIGINT DEFAULT 0,
                    notes TEXT
                )
            """)
            
            print("Creating table: system_files")
            cur.execute("""
                CREATE TABLE system_files (
                    id SERIAL PRIMARY KEY,
                    filename VARCHAR(255) UNIQUE NOT NULL,
                    content TEXT,
                    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            print("Creating table: payees")
            cur.execute("""
                CREATE TABLE payees (
                    id SERIAL PRIMARY KEY,
                    vendor VARCHAR(255) UNIQUE NOT NULL,
                    alias TEXT,
                    default_category VARCHAR(100),
                    default_project VARCHAR(255),
                    default_method VARCHAR(50),
                    ai_metadata JSONB
                )
            """)

            print("Inserting internal virtual projects...")
            cur.execute("""
                INSERT INTO projects (id, name, projectType) VALUES 
                ('internal_personal', 'Cá nhân', 'Internal'),
                ('internal_company', 'Công ty', 'Internal')
                ON CONFLICT (id) DO NOTHING;
            """)
            
            conn.commit()
            print("Schema initialized successfully!")
    except Exception as e:
        print(f"Error initializing schema: {e}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    init_schema()
