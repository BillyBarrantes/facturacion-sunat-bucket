import requests

url = "http://localhost:8000/api/v1/comprobantes/emitir"
payload = {
    "tipo_comprobante": "01",
    "serie": "F001",
    "numero": 12,
    "cliente_tipo_doc": "6",
    "cliente_num_doc": "20600000001",
    "cliente_razon_social": "TEST SAC",
    "cliente_direccion": "LIMA",
    "moneda": "PEN",
    "metodo_pago": "EFECTIVO",
    "descuento_global": 0,
    "anticipo_total": 0,
    "items": [
        {
            "codigo": "P001",
            "descripcion": "TEST",
            "unidad_medida": "NIU",
            "cantidad": 1,
            "precio_unitario": 118
        }
    ]
}
headers = {"Authorization": "Bearer test-token"}

try:
    response = requests.post(url, json=payload, headers=headers)
    print("Status Code:", response.status_code)
    print("Response JSON:", response.json())
except Exception as e:
    print("Error:", e)
