import psycopg2
import os

DATABASE_URL = "postgresql://postgres:jJ7O7ejunRzIWIit@db.puewflzmyqoshiccjkcw.supabase.co:5432/postgres"

print("Connecting...")
try:
    conn = psycopg2.connect(DATABASE_URL, sslmode='require', connect_timeout=5)
    print("Connected!")
    conn.close()
except Exception as e:
    print(f"Error: {e}")
