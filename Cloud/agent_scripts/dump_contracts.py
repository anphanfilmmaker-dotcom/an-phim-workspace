import sys
import codecs
from docx import Document
import glob

sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')

contracts = [
    r"g:\My Drive\[ANPHIM] MASTER PLANN\02_PROJECTs\K87K\Documents\_THÁNG 5\HĐDV -WINTERLAND87- AN FILM.docx",
    r"g:\My Drive\[ANPHIM] MASTER PLANN\02_PROJECTs\K87K\Documents\_THÁNG 6\[080626]HDDV - Winterland87 Tháng 6.docx",
    r"g:\My Drive\[ANPHIM] MASTER PLANN\02_PROJECTs\VISTA X AN PHIM\AI_ATERA CENTRAL\Documents\Copy of HĐDV_ATERA- AN FILM.docx",
    r"g:\My Drive\[ANPHIM] MASTER PLANN\02_PROJECTs\VISTA X AN PHIM\AI_DONG THANG LONG\Documents\HĐDV_DTL- AN FILM.docx",
    r"g:\My Drive\[ANPHIM] MASTER PLANN\02_PROJECTs\VISTA X AN PHIM\Cát Bà - The Marina\Documents\HĐDV -Cát Bà - The Marina- AN FILM.docx"
]

with open('e:/agent/dashboard/agent_scripts/contracts_dump.txt', 'w', encoding='utf-8') as f:
    for c in contracts:
        f.write(f"\n--- CONTRACT: {c} ---\n")
        try:
            doc = Document(c)
            # Find the table in the first half of the document
            for table in doc.tables:
                for row in table.rows:
                    f.write('\t'.join([cell.text.replace('\n', ' ') for cell in row.cells]) + '\n')
        except Exception as e:
            f.write(f"Error: {e}\n")
