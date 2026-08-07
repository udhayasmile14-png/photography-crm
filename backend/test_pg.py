import psycopg2

def diagnose():
    print("Testing connections to PostgreSQL...")
    
    # Try default 'postgres' database
    try:
        conn = psycopg2.connect(
            dbname="postgres",
            user="postgres",
            password="udha@123*",
            host="localhost",
            port="5432"
        )
        print("Successfully connected to 'postgres' database!")
        
        # List all database names on the server
        cur = conn.cursor()
        cur.execute("SELECT datname FROM pg_database WHERE datistemplate = false;")
        databases = [row[0] for row in cur.fetchall()]
        print(f"Available databases on server: {databases}")
        cur.close()
        conn.close()
        return
    except Exception as e:
        print(f"Failed to connect to 'postgres' database: {e}")

    # Try 'photography_crm_db' database
    try:
        conn = psycopg2.connect(
            dbname="photography_crm_db",
            user="postgres",
            password="udha@123*",
            host="localhost",
            port="5432"
        )
        print("Successfully connected to 'photography_crm_db' database!")
        conn.close()
        return
    except Exception as e:
        print(f"Failed to connect to 'photography_crm_db' database: {e}")

if __name__ == "__main__":
    diagnose()
