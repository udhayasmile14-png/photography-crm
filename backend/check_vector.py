import psycopg2

def check_extension():
    try:
        conn = psycopg2.connect(
            dbname="postgres",
            user="postgres",
            password="udha@123*",
            host="localhost",
            port="5432"
        )
        cur = conn.cursor()
        
        # Check if vector extension is already created or can be created
        try:
            cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")
            conn.commit()
            print("Successfully enabled 'pgvector' extension!")
        except Exception as e:
            print(f"Could not enable 'pgvector' extension: {e}")
            print("Note: If pgvector is not installed on your PG instance, we can still implement vector math using floats.")
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Connection error: {e}")

if __name__ == "__main__":
    check_extension()
