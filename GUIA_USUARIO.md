# 📖 Guía de Usuario - Cami Candy POS v2.0

> **Sistema de Punto de Venta completo para Cami Candy**  
> Incluye: Inventario, Ventas, Clientes, Rutas, Gastos, Caducidades y Reportes

---

## 📋 Índice

1. [Acceso al Sistema](#-acceso-al-sistema)
2. [Panel de Administración](#-panel-de-administración)
3. [Gestión de Inventario](#-gestión-de-inventario)
4. [Cartelera de Clientes (NUEVO)](#-cartelera-de-clientes-nuevo)
5. [Gestión de Rutas (NUEVO)](#-gestión-de-rutas-nuevo)
6. [Control de Gastos (NUEVO)](#-control-de-gastos-nuevo)
7. [Punto de Venta](#-punto-de-venta)
8. [Reportes y Dashboard](#-reportes-y-dashboard)
9. [Vista del Vendedor (Móvil)](#-vista-del-vendedor-móvil)
10. [Configuración](#-configuración)

---

## 🔐 Acceso al Sistema

### Credenciales de Administrador
- **Usuario:** `admin`
- **Contraseña:** `admin12345`

### URLs de Acceso
| Vista | URL | Dispositivo |
|-------|-----|-------------|
| **Panel Admin** | `/index.html` o `/` | PC/Laptop |
| **Vista Vendedor** | `/vendedor.html` | Móvil/Tablet |

> ⚠️ **Importante:** La vista del vendedor no requiere login, está diseñada para acceso rápido en campo.

---

## 🏠 Panel de Administración

El sidebar izquierdo contiene todas las secciones del sistema:

| Icono | Sección | Descripción |
|:-----:|---------|-------------|
| 📦 | **Inventario** | Gestión de productos, stock y categorías |
| 💰 | **Punto de Venta** | Realizar ventas desde el panel admin |
| 👥 | **Clientes** | Cartelera de clientes (CRM) |
| 🛣️ | **Rutas** | Administrar zonas de distribución |
| 💸 | **Gastos** | Control de gastos operativos |
| 📊 | **Reportes** | Estadísticas y reportes de ventas |
| 📈 | **Dashboard** | Resumen general del negocio |
| ⚙️ | **Configuración** | Ajustes del sistema |

---

## 📦 Gestión de Inventario

### Agregar un Producto

1. Ve a **Gestión de Inventario**
2. Completa el formulario:
   - **Nombre del Producto** (obligatorio)
   - **Tipo/Categoría** (Concentrado o Embolsado)
   - **Precio de Venta** (obligatorio)
   - **Costo** (opcional) - Ahora puedes dejarlo vacío
   - **Tipo de Costo**: 
     - *Por Unidad* - El costo es por cada unidad
     - *Por Lote* - El costo es por un grupo de unidades
   - **Inventario Inicial** (obligatorio)
   - **Inventario Mínimo** - Nivel de alerta
   - **Fecha de Caducidad** (opcional) - Se mostrará alerta 15 días antes

3. El **código de barras** se genera automáticamente (formato: `CAMI-XXX-0000`)
4. Clic en **Agregar Producto**

### 📅 Sistema de Caducidades (NUEVO)

El sistema ahora rastrea las fechas de caducidad:

| Estado | Badge | Significado |
|--------|-------|-------------|
| ☠️ Rojo | **CADUCADO** | Producto ya venció |
| ⚠️ Amarillo | **X días** | Faltan 15 días o menos para caducar |
| ✅ Sin badge | Vigente | Más de 15 días de vigencia |

Los productos con alertas de caducidad se muestran directamente en la tabla de inventario.

### Ajustar Stock

1. En la tabla de productos, clic en el botón **📦** (ajustar stock)
2. Selecciona el tipo:
   - **Entrada** - Aumentar stock (compras, devoluciones)
   - **Salida** - Disminuir stock (mermas, pérdidas)
   - **Ajuste manual** - Corregir a un número específico
3. Ingresa la cantidad y notas (opcional)
4. Guarda el ajuste

---

## 👥 Cartelera de Clientes (NUEVO)

### Acceso
- **Panel Admin:** Sidebar → Clientes
- **Vista Vendedor:** Pestaña "Clientes"

### Información de cada Cliente
| Campo | Descripción | Obligatorio |
|-------|-------------|:-----------:|
| Nombre del Local | Ej: "Tienda Don Pedro" | ✅ |
| Nombre del Dueño | Ej: "Pedro López" | ❌ |
| Teléfono | Número de contacto | ❌ |
| Ruta | Zona geográfica asignada | ✅ |
| Dirección | Ubicación física | ❌ |
| Referencia | Ej: "Frente a la iglesia" | ❌ |
| Notas | Información adicional | ❌ |

### Estadísticas de Clientes (Panel Admin)
- **Total Clientes** - Clientes registrados
- **Con Crédito** - Clientes con deuda pendiente
- **Rutas Activas** - Zonas con clientes
- **Nuevos este Mes** - Clientes agregados en el mes

### Crear Cliente desde Vista Vendedor
1. En el modal de venta, puedes seleccionar cliente o crear uno nuevo
2. Opción "➕ Nuevo Cliente..." abre el formulario rápido
3. El cliente se crea y se vincula automáticamente a la venta

### Buscar Clientes
- Usa la barra de búsqueda para encontrar por nombre, dueño o teléfono
- Filtra por ruta usando el selector

---

## 🛣️ Gestión de Rutas (NUEVO)

### Rutas Preconfiguradas
El sistema incluye 9 rutas por defecto:

1. 📍 Comitán
2. 📍 Palenque
3. 📍 Tenozique
4. 📍 Salto de Agua
5. 📍 Trinitaria
6. 📍 Comalapa
7. 📍 Chicomuselo
8. 📍 Tzimol
9. 📍 Margaritas

### Administrar Rutas

| Acción | Cómo hacerlo |
|--------|--------------|
| **Crear ruta** | Clic en "Nueva Ruta" → Ingresa nombre y descripción |
| **Editar ruta** | Clic en el ícono ✏️ de la ruta |
| **Activar/Desactivar** | Clic en ▶️ o ⏸️ según el estado actual |

> **Nota:** Las rutas desactivadas no aparecen en los selectores pero mantienen su historial.

### Uso de Rutas
- Cada cliente debe tener una ruta asignada
- Los gastos pueden asociarse a rutas específicas
- Las ventas pueden vincularse a rutas para reportes

---

## 💸 Control de Gastos (NUEVO)

### Registrar un Gasto

1. Ve a **Control de Gastos**
2. Completa el formulario:
   - **Categoría** (obligatorio):
     - 📦 Envíos
     - ⛽ Gasolina
     - 🛍️ Bolsas/Empaque
     - 🎯 Sellos/Etiquetas
     - 💰 Sueldos
     - 📋 Otros
   - **Monto** (obligatorio)
   - **Fecha** (por defecto: hoy)
   - **Ruta** (opcional) - Para gastos de una ruta específica
   - **Descripción** (opcional)
3. Clic en **Registrar Gasto**

### Resumen de Gastos

El panel muestra 4 tarjetas de resumen:

| Tarjeta | Información |
|---------|-------------|
| 🔴 Gastos Hoy | Total gastado hoy + cantidad de registros |
| 🟠 Gastos del Mes | Total del mes actual |
| 🔵 Gasolina | Gasto en combustible este mes |
| 🟢 Sueldos | Gasto en salarios este mes |

### Tabla de Gastos Recientes
- Muestra los últimos 50 gastos
- Cada gasto puede eliminarse con el botón 🗑️

---

## 💰 Punto de Venta

### Realizar una Venta

1. Selecciona productos tocando/haciendo clic en ellos
2. Usa los botones **+** y **-** para ajustar cantidades
3. Clic en **Cobrar**
4. Completa la información:
   - **Ruta de Venta** (NUEVO) - Selecciona la zona
   - **Cliente** (NUEVO) - Selecciona o crea cliente
   - **Nombre del Cliente** (si no seleccionaste cliente)
   - **Método de Pago**:
     - 💵 Efectivo
     - 📲 Transferencia
     - 🏦 Depósito
     - 🤝 A Crédito (Pendiente)

5. Si es **A Crédito**, selecciona fecha de pago
6. Clic en **Confirmar Venta**

### Recibo de Venta
Después de cada venta puedes:
- 📄 **Guardar PDF** - Imprimir o guardar como PDF
- 🖼️ **Imagen** - Descargar como imagen PNG
- 📱 **WhatsApp** - Compartir el recibo por WhatsApp

---

## 📊 Reportes y Dashboard

### Dashboard
- Ventas del día
- Stock bajo (productos con alerta)
- Productos más vendidos
- Resumen mensual

### Reportes
- **Reporte Diario Detallado** - Desglose por producto
- **Ventas por período** - Selecciona rango de fechas
- **Exportar a Excel** - Descarga los datos

### 🕐 Pagos Pendientes (Créditos)
- Lista de ventas a crédito sin pagar
- Marcar como pagado cuando el cliente abone
- Ver fecha de vencimiento

---

## 📱 Vista del Vendedor (Móvil)

### Acceso
Navega a `/vendedor.html` desde cualquier dispositivo móvil.

### Pestañas Disponibles

| Pestaña | Función |
|---------|---------|
| 🛒 **Venta** | Realizar ventas rápidas |
| 👥 **Clientes** (NUEVO) | Ver y crear clientes |
| 💳 **Créditos** | Ver ventas pendientes de pago |

### Funciones del Vendedor
- ✅ Ver productos disponibles
- ✅ Agregar al carrito
- ✅ Completar ventas
- ✅ Ver/crear clientes (NUEVO)
- ✅ Llamar a clientes directamente (NUEVO)
- ✅ Ver ventas a crédito pendientes
- ✅ Generar recibos
- ✅ Compartir por WhatsApp

---

## ⚙️ Configuración

### Datos del Negocio
- Nombre del negocio
- Dirección
- Teléfono
- Logo (opcional)

### Configuración de Ventas
- Símbolo de moneda ($)
- Tasa de impuesto (%)
- Mensaje del recibo

### Categorías de Productos
- Agregar nuevas categorías
- Eliminar categorías (si no tienen productos)

### Datos y Respaldos
- **Exportar datos** - Descarga respaldo JSON
- **Importar datos** - Restaurar desde respaldo
- **Restablecer** - Limpiar todos los datos (¡cuidado!)

---

## ❓ Preguntas Frecuentes

### ¿Cómo registro la caducidad de un producto?
Al agregar o editar un producto, usa el campo **Fecha de Caducidad**. El sistema mostrará alertas automáticamente 15 días antes.

### ¿Puedo tener clientes sin ruta?
No, cada cliente debe tener una ruta asignada. Esto ayuda a organizar las visitas y generar reportes por zona.

### ¿Qué pasa si un cliente tiene crédito?
Se muestra un badge rojo con el monto adeudado. Puedes ver todos los créditos pendientes en la pestaña "Créditos" de la vista del vendedor o en "Pagos Pendientes" del admin.

### ¿Cómo marco una venta a crédito como pagada?
En la sección de "Pagos Pendientes", busca la venta y clic en **Marcar como Pagado**.

### ¿Cómo agrego una nueva ruta?
Ve a **Rutas** en el sidebar → Clic en **Nueva Ruta** → Ingresa nombre y descripción.

### ¿Puedo asociar gastos a una ruta específica?
Sí, al registrar un gasto puedes seleccionar opcionalmente la ruta relacionada (útil para gastos de gasolina, por ejemplo).

---

## 🆕 Novedades v2.0 (Enero 2026)

### Nuevas Funcionalidades
1. ✅ **Cartelera de Clientes (CRM)** - Gestión completa de clientes
2. ✅ **Gestión de Rutas** - 9 rutas preconfiguradas
3. ✅ **Control de Gastos** - 6 categorías de gastos
4. ✅ **Sistema de Caducidades** - Alertas 15 días antes
5. ✅ **Costo Opcional** - Ya no es obligatorio ingresar costo
6. ✅ **Tipo de Costo** - Por unidad o por lote
7. ✅ **Selector de Cliente en Venta** - Vincular ventas a clientes
8. ✅ **Selector de Ruta en Venta** - Estadísticas por zona
9. ✅ **Vista de Clientes para Vendedor** - Acceso en campo
10. ✅ **Llamada directa a clientes** - Botón de llamar en móvil

---

## 📞 Soporte

Para reportar problemas o solicitar mejoras, contacta al administrador del sistema.

---

*Cami Candy POS v2.0 - © 2024-2026 Todos los derechos reservados*
