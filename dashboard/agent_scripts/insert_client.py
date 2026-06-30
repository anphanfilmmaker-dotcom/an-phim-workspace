import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from db_connection import execute_query

if sys.platform.startswith('win'):
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

def insert_vistax():
    query = """
        INSERT INTO clients (id, name, tax_id, address, rep_name, rep_role)
        VALUES (%s, %s, %s, %s, %s, %s)
        ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            tax_id = EXCLUDED.tax_id,
            address = EXCLUDED.address,
            rep_name = EXCLUDED.rep_name,
            rep_role = EXCLUDED.rep_role
    """
    params = (
        "VISTA_X",
        "CÔNG TY TNHH VISTAX",
        "0319191990",
        "81 Cách Mạng Tháng Tám, Phường Bến Thành, TP. Hồ Chí Minh, Việt Nam",
        "Bà Vũ Nhật Ánh",
        "Giám đốc"
    )
    
    success = execute_query(query, params, fetch=False)
    if success:
        print("Đã nhập thành công CÔNG TY TNHH VISTAX vào bảng clients!")
    else:
        print("Lỗi khi nhập dữ liệu.")

if __name__ == "__main__":
    insert_vistax()
