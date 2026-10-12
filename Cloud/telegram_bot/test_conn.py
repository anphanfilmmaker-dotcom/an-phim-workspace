import psycopg2

regions = [
    "ap-southeast-1", "ap-southeast-2", "ap-northeast-1", "ap-northeast-2", "ap-south-1",
    "us-east-1", "us-east-2", "us-west-1", "us-west-2",
    "eu-central-1", "eu-west-1", "eu-west-2", "eu-west-3", "eu-north-1",
    "ca-central-1", "sa-east-1"
]

project_id = "puewflzmyqoshiccjkcw"
password = "jJ7O7ejunRzIWIit"

for r in regions:
    host = f"aws-0-{r}.pooler.supabase.com"
    url = f"postgresql://postgres.{project_id}:{password}@{host}:6543/postgres"
    try:
        conn = psycopg2.connect(url, sslmode='require', connect_timeout=3)
        cur = conn.cursor()
        cur.execute("SELECT 1;")
        print(f"FOUND MATCHING REGION! -> {r} ({host})")
        conn.close()
        break
    except Exception as e:
        err = str(e)
        if "tenant/user" not in err and "ENOTFOUND" not in err and "timeout" not in err:
            print(f"Region {r}: {err.strip()}")
        else:
            print(f"Region {r}: not this region")
