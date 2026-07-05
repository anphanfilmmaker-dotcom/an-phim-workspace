import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from db_connection import get_connection

def update_tram_anh_profile():
    file_path = 'g:/My Drive/[ANPHIM] MASTER PLANN/.agents/guidelines/tram_anh_sop.md'
    
    if not os.path.exists(file_path):
        print("SOP file not found.")
        return
        
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            system_prompt = f.read()
            
        conn = get_connection()
        if not conn:
            print("Failed to connect to database.")
            return
            
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE agent_profiles
                SET system_prompt = %s
                WHERE id = 'tram_anh'
            """, (system_prompt,))
            
            conn.commit()
            print("Successfully updated Trâm Anh's system prompt in agent_profiles!")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    update_tram_anh_profile()
