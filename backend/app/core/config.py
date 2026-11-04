from dotenv import load_dotenv
import os

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

# Origens liberadas no CORS, separadas por vírgula
CORS_ORIGINS = [
    o.strip()
    for o in os.getenv("CORS_ORIGINS", "http://localhost:4200").split(",")
    if o.strip()
]

if not SUPABASE_URL or not SUPABASE_KEY:
    print("⚠️  Atenção: SUPABASE_URL ou SUPABASE_KEY não configurados no .env")
