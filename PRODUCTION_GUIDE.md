# Guía de Transición a Producción SUNAT & Configuración CDT

Esta guía explica el procedimiento para cambiar la aplicación del **Ambiente BETA (Pruebas)** al **Ambiente de PRODUCCIÓN Oficial de SUNAT**.

---

## 1. Requisitos Previos en SUNAT SOL (Emisor)

1. **Clave SOL Secundaria**:
   - Ingresar al portal [SUNAT SOL](https://e-menu.sunat.gob.pe/cl-ti-itmndoc/sys/sso/LoginSOL.htm) con el RUC, Usuario SOL principal y Clave.
   - Ir a: **Administración de Usuarios Secundarios** $\rightarrow$ **Crear Usuario Secundario** (ej. usuario `FACTURADOR01`).
   - Asignar permisos en la matriz de accesos para:
     - *Comprobantes de Pago Electrónicos (CPE)*.
     - *Envío de comprobantes vía Web Service*.

2. **Obtención del Certificado Digital Tributario (CDT)**:
   - Descargar el CDT gratuito desde la plataforma SOL de SUNAT o adquirir un certificado `.pfx` / `.p12` de una Entidad de Certificación autorizada (ej. Reniec, Llama.pe, Camerfirma).
   - Anotar la contraseña privada del certificado (`CERT_PASSWORD`).

---

## 2. Configuración en la Plataforma SaaS Multi-Tenant

Para activar a una nueva MYPE cliente en Producción:

1. **Actualizar la variable de entorno en el Backend**:
   ```env
   SUNAT_ENV=PRODUCCION
   ```

2. **Cargar los datos de la MYPE en Supabase (`companies`)**:
   - `sol_user`: El usuario secundario creado (ej. `FACTURADOR01`).
   - `sol_pass_encrypted`: La clave del usuario secundario.
   - `cdt_pfx_url`: La URL privada del certificado `.pfx` cargado a Cloudflare R2.
   - `cdt_password_encrypted`: La contraseña privada del certificado.

---

## 3. Endpoints Oficiales de SUNAT en Producción

El sistema cambiará automáticamente los Web Services a las URLs de producción:

- **Facturas, Boletas y Notas (SOAP)**:
  `https://e-factura.sunat.gob.pe/ol-ti-itcpfegem/billService`

- **Guías de Remisión GRE (API REST OAuth 2.0)**:
  `https://api-cpe.sunat.gob.pe/v1/contribuyente/gem`

---

## 4. Verificación del Primer Comprobante en Producción

1. Emitir una **Factura de prueba (ej. F001-00000001)** por un monto pequeño (ej. S/ 1.00).
2. Verificar en el panel que SUNAT devuelva la constancia **CDR con estado ACEPTADO (Código 0)**.
3. Consultar la validez del comprobante en el portal de SUNAT SOL: **Consulta de Validez de CPE**.
