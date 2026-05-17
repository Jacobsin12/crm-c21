import os
import sys
import json
import time
import pdfplumber
import mysql.connector
from google import genai
import fitz
from pyzbar.pyzbar import decode
from PIL import Image

# ==========================================
# CONFIGURACIONES INICIALES
# ==========================================

GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY", "")
client = genai.Client(api_key=GOOGLE_API_KEY)

DB_CONFIG = {
    "host": os.environ.get("DB_HOST", "localhost"),
    "user": os.environ.get("DB_USER", "root"),
    "password": os.environ.get("DB_PASS", "0512"),
    "database": os.environ.get("DB_NAME", "crm_inmobiliario")
}

# ==========================================
# FUNCIONES PRINCIPALES
# ==========================================

def extraer_texto_pdf(ruta_pdf):
    texto_completo = ""
    with pdfplumber.open(ruta_pdf) as pdf:
        for pagina in pdf.pages:
            texto = pagina.extract_text()
            if texto:
                texto_completo += texto + "\n"
    return texto_completo

def estructurar_con_gemini(texto_pdf):
    prompt = f"""
    Analiza el siguiente texto de una ficha técnica inmobiliaria y conviértelo UNICAMENTE en un objeto JSON con las llaves que te indico abajo. 
    
    REGLAS IMPORTANTES:
    - No inventes datos. Si un campo no viene en el texto o dice "-1", pon null.
    - Los números como 'precio', 'superficie_terreno', etc., deben ser puramente numéricos (float o int), sin signos de pesos, comas ni letras.
    - Las 'amenidades' deben ser una lista de strings.
    - No envíes bloques de formato markdown (como ```json ), devuelve el JSON limpio y directo.

    Estructura requerida:
    {{
        "id_propiedad": "string",
        "titulo": "string",
        "tipo_propiedad": "string",
        "tipo_operacion": "string",
        "precio": number,
        "moneda": "string",
        "direccion": "string",
        "descripcion": "string o null",
        "zona": "string",
        "superficie_terreno": number o null,
        "superficie_construccion": number o null,
        "medida_frente": number o null,
        "medida_fondo": number o null,
        "niveles_construidos": number o null,
        "recamaras": number o null,
        "medios_banos": number o null,
        "banos_completos": number o null,
        "estacionamientos": number o null,
        "edo_conservacion": "string o null",
        "amenidades": ["string", "string"]
    }}

    Texto de la ficha técnica:
    {texto_pdf}
    """
    
    respuesta = client.models.generate_content(
        model='gemini-2.5-flash',
        contents=prompt,
    )
    
    texto_respuesta = respuesta.text.strip()
    texto_respuesta = texto_respuesta.replace("```json", "").replace("```", "").strip()
    
    return json.loads(texto_respuesta)

def extraer_url_qr(ruta_pdf):
    try:
        doc = fitz.open(ruta_pdf)
        for i in range(len(doc)):
            page = doc.load_page(i)
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            decoded = decode(img)
            if decoded:
                for obj in decoded:
                    texto = obj.data.decode('utf-8')
                    if texto.startswith("http"):
                        return texto
        return None
    except Exception as e:
        print(f"  [ERROR] No se pudo extraer QR: {e}")
        return None

def insertar_en_mysql(datos):
    try:
        conexion = mysql.connector.connect(**DB_CONFIG)
        cursor = conexion.cursor()
        
        amenidades_str = ", ".join(datos["amenidades"]) if datos["amenidades"] else None

        query = """
            INSERT INTO propiedades (
                id_propiedad, titulo, tipo_propiedad, tipo_operacion, precio, moneda,
                direccion, descripcion, zona, superficie_terreno, superficie_construccion,
                medida_frente, medida_fondo, niveles_construidos, recamaras, medios_banos,
                banos_completos, estacionamientos, edo_conservacion, amenidades, carpeta_drive_fotos
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE 
                titulo=VALUES(titulo), precio=VALUES(precio), descripcion=VALUES(descripcion), 
                carpeta_drive_fotos=VALUES(carpeta_drive_fotos), estatus_propiedad='Disponible';
        """
        
        valores = (
            datos.get("id_propiedad"), datos.get("titulo"), datos.get("tipo_propiedad"), datos.get("tipo_operacion"),
            datos.get("precio"), datos.get("moneda"), datos.get("direccion"), datos.get("descripcion"), datos.get("zona"),
            datos.get("superficie_terreno"), datos.get("superficie_construccion"), datos.get("medida_frente"),
            datos.get("medida_fondo"), datos.get("niveles_construidos"), datos.get("recamaras"), datos.get("medios_banos"),
            datos.get("banos_completos"), datos.get("estacionamientos"), datos.get("edo_conservacion"),
            amenidades_str, datos.get("carpeta_drive_fotos")
        )
        
        cursor.execute(query, valores)
        conexion.commit()
        return True
    except mysql.connector.Error as error:
        print(f"  [ERROR] Error de MySQL: {error}")
        return False
    finally:
        if conexion.is_connected():
            cursor.close()
            conexion.close()

# ==========================================
# EJECUCIÓN POR ARGUMENTOS (NODE.JS COMPATIBLE)
# ==========================================
if __name__ == "__main__":
    # Capturamos los archivos que nos pasen por comando (saltándonos el nombre del script)
    archivos_a_procesar = sys.argv[1:]

    if not archivos_a_procesar:
        print("--- Error: No se proporcionó ningún archivo PDF para procesar. ---")
        print("Uso: python importador_dashboard.py archivo1.pdf archivo2.pdf ...")
        sys.exit(1)

    print(f"=== Procesando {len(archivos_a_procesar)} archivo(s) desde el Dashboard ===\n")

    for idx, ruta_pdf in enumerate(archivos_a_procesar, 1):
        if not os.path.exists(ruta_pdf):
            print(f"[{idx}/{len(archivos_a_procesar)}] [ERROR] Archivo no encontrado: {ruta_pdf}")
            continue

        nombre_archivo = os.path.basename(ruta_pdf)
        print(f"[{idx}/{len(archivos_a_procesar)}] Leyendo: {nombre_archivo}")
        
        try:
            texto = extraer_texto_pdf(ruta_pdf)
            datos = estructurar_con_gemini(texto)
            
            # Buscar URL del QR
            print(f"  [INFO] Buscando código QR para fotos...")
            url_qr = extraer_url_qr(ruta_pdf)
            if url_qr:
                print(f"  [OK] QR detectado con enlace: {url_qr}")
            else:
                print(f"  [INFO] No se detectó código QR en el PDF.")
                
            datos['carpeta_drive_fotos'] = url_qr

            guardado_ok = insertar_en_mysql(datos)
            
            if guardado_ok:
                print(f"  [OK] Guardado exitoso con ID: {datos['id_propiedad']}\n")
            
            # Si hay más de un archivo, esperamos un par de segundos entre peticiones
            if idx < len(archivos_a_procesar):
                time.sleep(2)
                
        except Exception as e:
            print(f"  [ERROR] Error al procesar {nombre_archivo}: {e}\n")

    print("=== Tarea finalizada ===")