import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from db_connection import execute_query

if sys.platform.startswith('win'):
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

def update_k87k():
    query = """
        UPDATE clients 
        SET name = %s, tax_id = %s, address = %s, rep_name = %s, rep_role = %s, notes = %s
        WHERE id = 'K87K'
    """
    params = (
        "CÔNG TY TNHH K87K",
        "0319185161",
        "125 Hai Bà Trưng, phường Sài Gòn, Thành phố Hồ Chí Minh, Việt Nam",
        "Bà Đỗ Thụy Huyền Diễm Chinh",
        "Giám Đốc",
        "Thương hiệu: WINTERLAND87"
    )
    
    success = execute_query(query, params, fetch=False)
    if success:
        print("Đã cập nhật thành công hồ sơ chuẩn của K87K (WINTERLAND87) vào bảng clients!")
    else:
        print("Lỗi khi cập nhật K87K.")

if __name__ == "__main__":
    update_k87k()
