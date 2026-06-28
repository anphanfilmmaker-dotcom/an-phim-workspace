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
                DROP TABLE IF EXISTS projects CASCADE;
                DROP TABLE IF EXISTS actions CASCADE;
                DROP TABLE IF EXISTS schedule CASCADE;
                DROP TABLE IF EXISTS expenseTransactions CASCADE;
                DROP TABLE IF EXISTS incomes CASCADE;
                DROP TABLE IF EXISTS system_files CASCADE;
                DROP TABLE IF EXISTS payees CASCADE;
            """)
            
            print("Creating table: projects")
            cur.execute("""
                CREATE TABLE projects (
                    id VARCHAR(255) PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    client VARCHAR(255),
                    status VARCHAR(50),
                    budget BIGINT DEFAULT 0,
                    received BIGINT DEFAULT 0,
                    paymentD1 BIGINT DEFAULT 0,
                    paymentD2 BIGINT DEFAULT 0,
                    paymentD3 BIGINT DEFAULT 0,
                    dueDate VARCHAR(50),
                    nextAction VARCHAR(255),
                    nextActionDue VARCHAR(50),
                    projectType VARCHAR(50),
                    paymentPhase VARCHAR(50),
                    paymentPhaseProgress INT DEFAULT 0,
                    thumbnailUrl TEXT,
                    notes TEXT,
                    milestones JSONB
                )
            """)
            
            print("Creating table: projectDocuments")
            cur.execute("""
                CREATE TABLE projectDocuments (
                    projectId VARCHAR(255) PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
                    projectName VARCHAR(255),
                    quote BOOLEAN DEFAULT FALSE,
                    contract BOOLEAN DEFAULT FALSE,
                    vatR1 BOOLEAN DEFAULT FALSE,
                    vatR2 BOOLEAN DEFAULT FALSE,
                    vatR3 BOOLEAN DEFAULT FALSE,
                    liquidation BOOLEAN DEFAULT FALSE,
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
                    projectId VARCHAR(255)
                )
            """)
            
            print("Creating table: expenseTransactions")
            cur.execute("""
                CREATE TABLE expenseTransactions (
                    id VARCHAR(255) PRIMARY KEY,
                    date VARCHAR(50),
                    category VARCHAR(100),
                    project VARCHAR(255),
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
