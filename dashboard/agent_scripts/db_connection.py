import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

DATABASE_URL = os.getenv("DATABASE_URL")

def get_connection():
    """
    Returns a PostgreSQL database connection using psycopg2.
    Ensure that DATABASE_URL is set in your .env file.
    """
    try:
        conn = psycopg2.connect(DATABASE_URL, sslmode='require')
        return conn
    except Exception as e:
        print(f"Error connecting to database: {e}")
        return None

def execute_query(query, params=None, fetch=False):
    """
    Executes a query safely.
    If fetch=True, returns the fetched rows as dictionaries.
    """
    conn = get_connection()
    if not conn:
        return None
        
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, params)
            if fetch:
                result = cur.fetchall()
            else:
                conn.commit()
                result = True
        return result
    except Exception as e:
        print(f"Database error executing query: {e}")
        if conn:
            conn.rollback()
        return None
    finally:
        if conn:
            conn.close()
