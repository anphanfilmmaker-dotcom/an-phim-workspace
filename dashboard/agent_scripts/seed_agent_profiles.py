import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from db_connection import get_connection

def seed_agent_profiles():
    conn = get_connection()
    if not conn:
        print("Failed to connect to database.")
        return
        
    agents = [
        {
            'id': 'tram_anh',
            'name': 'Trâm Anh',
            'role': 'Project Manager (PM)',
            'file': 'C:/Users/AcePhan/.gemini/config/plugins/tram-anh-pm/skills/SKILL.md'
        },
        {
            'id': 'minh_dan',
            'name': 'Minh Đan',
            'role': 'Creative / Social Manager',
            'file': 'C:/Users/AcePhan/.gemini/config/plugins/minh-dan-creative/skills/SKILL.md'
        }
    ]
        
    try:
        with conn.cursor() as cur:
            for agent in agents:
                try:
                    with open(agent['file'], 'r', encoding='utf-8') as f:
                        prompt = f.read()
                except:
                    prompt = "Đang cập nhật..."
                    
                cur.execute("""
                    INSERT INTO agent_profiles (id, name, role, system_prompt)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE 
                    SET system_prompt = EXCLUDED.system_prompt
                """, (agent['id'], agent['name'], agent['role'], prompt))
            
            conn.commit()
            print("Successfully seeded agent_profiles!")
    except Exception as e:
        print(f"Error seeding database: {e}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    seed_agent_profiles()
