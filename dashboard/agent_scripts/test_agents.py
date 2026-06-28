import os
import subprocess
import json
import sys

# Set terminal output to UTF-8
if sys.platform.startswith('win'):
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

def run_command(cmd):
    print(f"\n--- Running: {' '.join(cmd)} ---")
    result = subprocess.run(cmd, capture_output=True, text=True, cwd=os.path.dirname(__file__), encoding='utf-8')
    try:
        output = json.loads(result.stdout.strip())
        print("[OK] Success!")
        print(json.dumps(output, indent=2, ensure_ascii=False))
    except Exception:
        print("Output:", result.stdout)
        if result.stderr:
            print("[ERROR]:", result.stderr)

if __name__ == "__main__":
    print("=== BAT DAU KIEM TRA HE THONG AGENTS ===")
    
    # 1. Test Tram Anh (PM)
    print("\n[1] Kiem tra Tram Anh (PM Agent)")
    run_command(["python", "tram_anh_pm.py", "add_project", "--client", "TestClient", "--name", "TestProject"])
    run_command(["python", "tram_anh_pm.py", "list_projects"])
    
    # 2. Test Quoc Bao (Sales)
    print("\n[2] Kiem tra Quoc Bao (Sales Agent)")
    run_command(["python", "quoc_bao_sales.py", "save_draft", "--project_id", "PROJ-TEST", "--draft_content", "Draft content test..."])
    
    # 3. Test Minh Dan (Creative)
    print("\n[3] Kiem tra Minh Dan (Creative Agent)")
    run_command(["python", "minh_dan_creative.py", "add_post", "--date", "2026-06-30", "--topic", "Test FB Post", "--content", "Hello world", "--image_path", "/img/test.jpg"])
    
    # 4. Test Minh Thu (Finance)
    print("\n[4] Kiem tra Minh Thu (Finance Agent)")
    run_command(["python", "minh_thu_finance.py", "scan_mail"])
    run_command(["python", "minh_thu_finance.py", "generate_contract", "--project_id", "PROJ-TEST"])

    # 5. Test Chi Hai (Admin/Token Tracker)
    print("\n[5] Kiem tra Chi Hai (Admin Agent) - Token Tracker")
    run_command(["python", "token_tracker.py", "log_usage", "--agent_id", "tram-anh", "--input_tokens", "1000", "--output_tokens", "500"])
    
    print("\n=== HOAN TAT KIEM TRA ===")
