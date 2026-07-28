import os
import sys
import psycopg2
from urllib.parse import urlparse

def run_migration():
    db_password = os.getenv("SUPABASE_DB_PASSWORD", "Luilly13md$")
    supabase_url = os.getenv("SUPABASE_URL", "https://ezoklvuorziucevhvbde.supabase.co")
    
    # Extraer el ref del proyecto de la URL de Supabase (ej: ezoklvuorziucevhvbde)
    project_ref = supabase_url.replace("https://", "").split(".")[0]
    
    # Intentar conexión con puerto 5432 y 6543 (pooler)
    hosts = [
        f"db.{project_ref}.supabase.co",
        f"aws-0-sa-east-1.pooler.supabase.com" # fallback si aplica
    ]
    
    conn = None
    connected_host = None
    
    for host in hosts:
        for port in [5432, 6543]:
            try:
                print(f"Intentando conectar a {host}:{port}...")
                conn = psycopg2.connect(
                    host=host,
                    port=port,
                    dbname="postgres",
                    user="postgres" if port == 5432 else f"postgres.{project_ref}",
                    password=db_password,
                    connect_timeout=10
                )
                connected_host = f"{host}:{port}"
                print(f"Conexión exitosa a Supabase PostgreSQL ({connected_host})!")
                break
            except Exception as e:
                print(f"Error conectando a {host}:{port}: {e}")
        if conn:
            break

    if not conn:
        print("CRÍTICO: No se pudo establecer conexión con la base de datos de Supabase.")
        sys.exit(1)

    try:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        schema_path = os.path.join(script_dir, "schema.sql")
        
        with open(schema_path, "r", encoding="utf-8") as f:
            sql_script = f.read()

        cur = conn.cursor()
        print("Ejecutando script DDL y políticas RLS en Supabase...")
        cur.execute(sql_script)
        conn.commit()
        cur.close()
        conn.close()
        print("¡Migración ejecutada con éxito! Todas las tablas y políticas RLS fueron creadas.")
    except Exception as e:
        print(f"Error durante la ejecución de la migración: {e}")
        sys.exit(1)

if __name__ == "__main__":
    run_migration()
