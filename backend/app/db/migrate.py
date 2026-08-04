import os
import sys
import psycopg2


def run_migration():
    db_password = os.getenv("SUPABASE_DB_PASSWORD")
    supabase_url = os.getenv("SUPABASE_URL")

    if not db_password or not supabase_url:
        print("ERROR: SUPABASE_DB_PASSWORD y SUPABASE_URL son obligatorios como variables de entorno.")
        sys.exit(1)

    project_ref = supabase_url.replace("https://", "").split(".")[0]

    hosts = [
        (f"db.{project_ref}.supabase.co", 5432, "postgres"),
        (f"aws-0-sa-east-1.pooler.supabase.com", 6543, f"postgres.{project_ref}"),
    ]

    conn = None
    connected_host = None

    for host, port, user in hosts:
        try:
            print(f"Intentando conectar a {host}:{port}...")
            conn = psycopg2.connect(
                host=host,
                port=port,
                dbname="postgres",
                user=user,
                password=db_password,
                connect_timeout=10,
            )
            connected_host = f"{host}:{port}"
            print(f"Conexion exitosa a Supabase PostgreSQL ({connected_host})!")
            break
        except Exception as e:
            print(f"Error conectando a {host}:{port}: {e}")

    if not conn:
        print("CRITICO: No se pudo establecer coneccion con la base de datos de Supabase.")
        sys.exit(1)

    try:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        schema_path = os.path.join(script_dir, "schema.sql")

        cur = conn.cursor()
        print("Ejecutando schema DDL y politicas RLS en Supabase...")
        with open(schema_path, "r", encoding="utf-8") as f:
            cur.execute(f.read())
        conn.commit()

        # Ejecutar migraciones incrementales numeradas (00x_*.sql)
        # ALTER TABLE ... ADD COLUMN IF NOT EXISTS para alinear BD existentes.
        migrations = sorted(
            f for f in os.listdir(script_dir)
            if f.endswith(".sql") and f[:3].isdigit() and f != "schema.sql"
        )
        for mig in migrations:
            mig_path = os.path.join(script_dir, mig)
            print(f"Ejecutando migracion incremental: {mig}")
            with open(mig_path, "r", encoding="utf-8") as f:
                cur.execute(f.read())
            conn.commit()
        cur.close()
        conn.close()
        print(f"Migracion ejecutada con exito! schema.sql + {len(migrations)} migraciones incrementales aplicadas.")
    except Exception as e:
        print(f"Error durante la ejecucion de la migracion: {e}")
        sys.exit(1)


if __name__ == "__main__":
    run_migration()