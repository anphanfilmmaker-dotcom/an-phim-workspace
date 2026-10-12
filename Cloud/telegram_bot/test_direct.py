import os
import psycopg2
from dotenv import load_dotenv

load_dotenv("/home/AcePhan/telegram_bot/.env")
conn = psycopg2.connect(os.getenv("DATABASE_URL"))
cur = conn.cursor()
cur.execute("SELECT count(*) FROM schedule;")
print("CONNECTED! Schedule count:", cur.fetchone()[0])
conn.close()
