import requests

url = "http://localhost:8000/api/v1/comprobantes/emitir"
payload = {
    "tipo_comprobante": "01",
    "serie": "F001",
    "numero": 1, # Should be ignored by backend!
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
            "descripcion": "TEST 2",
            "unidad_medida": "NIU",
            "cantidad": 2,
            "precio_unitario": 100
        }
    ]
}

try:
    # First insert
    response1 = requests.post(url, json=payload, headers={"Authorization": "Bearer test-token"})
    print("Res 1:", response1.json())
    # Second insert
    response2 = requests.post(url, json=payload, headers={"Authorization": "Bearer test-token"})
    print("Res 2:", response2.json())
except Exception as e:
    print("Error:", e)
