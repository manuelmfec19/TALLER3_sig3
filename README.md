# Geovisor de Amenaza por Inundación - Comuna 21, Cali

## 📋 Descripción del Proyecto

Este geovisor web permite analizar y visualizar la amenaza por inundación en la Comuna 21 de Santiago de Cali, Colombia. La aplicación proporciona herramientas interactivas para la gestión de datos geográficos, medición de distancias, búsqueda de direcciones y visualización de múltiples capas cartográficas.

## 🎯 Características Principales

### 🗺️ Visualización de Mapas
- **Mapa Base**: OpenStreetMap con vista satelital opcional
- **Capas GeoJSON**: Comuna 21, comunas aledañas, Navarro, Río Cauca
- **Capas WMS**: Barrios, construcciones, inundación fluvial, manzanas
- **Capas WFS**: Equipamientos educativos, salud, sitios de interés, zonas inundables, puntos de referencia, rutas
- **SITM Estaciones**: Información del sistema de transporte masivo

### 🛠️ Herramientas Interactivas
- **Búsqueda de Direcciones**: Localización de direcciones en Cali
- **GPS**: Obtención de ubicación actual del usuario
- **Medición de Distancias**: Herramienta para medir distancias en el mapa
- **Control de Capas**: Panel para activar/desactivar capas
- **Escala Dinámica**: Escala que se adapta al nivel de zoom
- **Flecha Norte**: Indicador de orientación

### 📊 Gestión de Datos
- **Adicionar**: Puntos de referencia, rutas y zonas inundables
- **Actualizar**: Modificación de registros existentes
- **Eliminar**: Eliminación de elementos de la base de datos
- **Formularios Dinámicos**: Interfaz adaptativa según el tipo de dato

## 🏗️ Estructura del Proyecto

```
GEOVISOR/
├── index.html              # Archivo principal HTML
├── style.css               # Estilos CSS
├── script.js               # Lógica JavaScript
├── README.md               # Documentación del proyecto
├── geojson/                # Archivos GeoJSON locales
│   ├── comuna_21.geojson
│   ├── comunas_aledañas.geojson
│   ├── navarro.geojson
│   └── rio_cauca.geojson
└── LOGO/
    └── LOGO.png            # Logo institucional
```

## 🚀 Instalación y Uso

### Requisitos Previos
- Navegador web moderno (Chrome, Firefox, Safari, Edge)
- Conexión a internet (para cargar servicios WMS/WFS)

### Instalación
1. Clona o descarga el repositorio
2. Abre el archivo `index.html` en tu navegador web
3. La aplicación se cargará automáticamente

### Uso Básico
1. **Navegación**: Usa el zoom y arrastra para navegar por el mapa
2. **Búsqueda**: Ingresa una dirección en el campo de búsqueda
3. **Capas**: Usa el panel de capas para activar/desactivar información
4. **Herramientas**: Utiliza los botones laterales para diferentes funciones

## 📁 Descripción de Archivos

### `index.html`
- Estructura principal de la aplicación web
- Incluye Leaflet CSS y JavaScript
- Define la interfaz de usuario con header, mapa y controles

### `style.css`
- Estilos completos para toda la aplicación
- Diseño responsivo y moderno
- Configuración de colores, fuentes y layout
- Estilos para controles de mapa y formularios

### `script.js`
- Lógica principal de la aplicación
- Configuración de Leaflet y capas de mapa
- Funciones para herramientas interactivas
- Gestión de formularios y datos
- Integración con servicios WMS/WFS

### Carpeta `geojson/`
Contiene archivos GeoJSON locales:
- **comuna_21.geojson**: Límites de la Comuna 21
- **comunas_aledañas.geojson**: Comunas vecinas
- **navarro.geojson**: Zona del Navarro
- **rio_cauca.geojson**: Curso del Río Cauca

### Carpeta `LOGO/`
- **LOGO.png**: Logo institucional ubicado en el header

## 🗺️ Servicios de Mapas Utilizados

### Servicios WMS (Web Map Service)
- **TALLER3sig3**: `http://44.198.27.212:8080/geoserver/TALLER3sig3/wms`
  - Barrios, construcciones, inundación fluvial, manzanas
- **IDESC Cali**: `https://ws-idesc.cali.gov.co/geoserver/wms`
  - SITM Estaciones

### Servicios WFS (Web Feature Service)
- **TALLER3sig3**: `http://44.198.27.212:8080/geoserver/TALLER3sig3/ows`
  - Equipamientos educativos, salud, sitios de interés
  - Zonas inundables, puntos de referencia, rutas

### Mapas Base
- **OpenStreetMap**: Mapa base principal
- **Esri World Imagery**: Vista satelital

## 🎨 Características de Diseño

### Paleta de Colores
- **Primario**: #2c3e50 (Azul oscuro)
- **Secundario**: #3498db (Azul claro)
- **Acento**: #e74c3c (Rojo)
- **Éxito**: #27ae60 (Verde)
- **Advertencia**: #f39c12 (Naranja)

### Tipografía
- Fuente principal: Arial, sans-serif
- Tamaños responsivos según dispositivo

### Layout
- Header fijo con logo y título
- Mapa principal ocupando 80% del ancho
- Panel lateral derecho con herramientas
- Controles flotantes para funcionalidades específicas

## 🔧 Funcionalidades Técnicas

### Gestión de Capas
- Control individual de visibilidad
- Leyenda dinámica
- Opacidad configurable
- Interacción con elementos (popups)

### Formularios Dinámicos
- Cambio automático según tabla seleccionada
- Validación de campos
- Limpieza automática de formularios
- Estados activos para herramientas

### Medición y Análisis
- Cálculo de distancias geodésicas
- Marcadores numerados
- Líneas de medición
- Información detallada en popups

### Búsqueda y Geolocalización
- Búsqueda por Nominatim (OpenStreetMap)
- Geolocalización del navegador
- Marcadores personalizados
- Información de precisión

## 📱 Responsividad

La aplicación está diseñada para funcionar en:
- **Desktop**: Pantallas grandes con todas las funcionalidades
- **Tablet**: Adaptación de controles y layout
- **Móvil**: Optimización para pantallas pequeñas

## 🔒 Consideraciones de Seguridad

- Validación de entrada en formularios
- Sanitización de datos de búsqueda
- Manejo de errores en servicios externos
- Confirmación para acciones destructivas

## 🐛 Solución de Problemas

### Problemas Comunes
1. **Capas no cargan**: Verificar conexión a internet y servicios WMS/WFS
2. **GPS no funciona**: Verificar permisos del navegador
3. **Búsqueda falla**: Verificar formato de dirección
4. **Rendimiento lento**: Reducir número de capas activas

### Compatibilidad
- **Navegadores**: Chrome 60+, Firefox 55+, Safari 12+, Edge 79+
- **Dispositivos**: Desktop, tablet, móvil
- **Sistemas**: Windows, macOS, Linux, Android, iOS

## 📈 Futuras Mejoras

- [ ] Integración con base de datos real
- [ ] Exportación de datos en diferentes formatos
- [ ] Análisis espacial avanzado
- [ ] Reportes automáticos
- [ ] Autenticación de usuarios
- [ ] Historial de cambios
- [ ] Modo offline para capas básicas

## 👥 Contribución

Para contribuir al proyecto:
1. Fork el repositorio
2. Crea una rama para tu feature
3. Realiza tus cambios
4. Envía un pull request

## 📄 Licencia

Este proyecto está desarrollado para fines educativos y de investigación en el contexto del análisis de amenazas por inundación en Santiago de Cali.

## 📞 Contacto

Para más información sobre este geovisor, contacta al equipo de desarrollo del proyecto SIG3.

---

**Desarrollado para el análisis de riesgos y planificación urbana en Santiago de Cali, Colombia.** 