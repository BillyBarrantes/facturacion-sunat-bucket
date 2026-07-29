import requests

url = "http://localhost:8000/api/v1/comprobantes/emitir"
payload = {
    "tipo_comprobante": "03",
    "serie": "B001",
    "numero": 1,
    "cliente_tipo_doc": "0",
    "cliente_num_doc": "00000000",
    "cliente_razon_social": "CLIENTES VARIOS",
    "cliente_direccion": "",
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
# We don't have the user's real JWT token, but let's see if verify_token falls back correctly.
# Wait, let's just make sure there are no DB errors on second insert of same client.
try:
    # First insert
    response1 = requests.post(url, json=payload, headers={"Authorization": "Bearer test-token"})
    print("Res 1:", response1.json())
    # Second insert
    payload["numero"] = 2
    response2 = requests.post(url, json=payload, headers={"Authorization": "Bearer test-token"})
    print("Res 2:", response2.json())
except Exception as e:
    print("Error:", e)
