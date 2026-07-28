import os
import httpx

def deploy_to_render():
    render_api_key = os.getenv("RENDER_API_KEY", "RENDER_API_KEY_PLACEHOLDER")
    service_id = os.getenv("RENDER_SERVICE_ID", "RENDER_SERVICE_ID_PLACEHOLDER")

    url = f"https://api.render.com/v1/services/{service_id}/deploys"
    
    headers = {
        "Authorization": f"Bearer {render_api_key}",
        "Accept": "application/json",
        "Content-Type": "application/json"
    }

    print(f"Iniciando despliegue en Render para servicio {service_id}...")

    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(url, headers=headers, json={"clearCache": "clear"})

        if response.status_code in [200, 201]:
            data = response.json()
            print("¡Despliegue activado exitosamente en Render!")
            print(f"Deploy ID: {data.get('id')}")
            print(f"Estado inicial: {data.get('status')}")
            return True
        else:
            print(f"Error respondiendo de Render HTTP {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print(f"Excepción al conectar con la API de Render: {e}")
        return False

if __name__ == "__main__":
    deploy_to_render()
