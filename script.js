const map = L.map('map', {
    minZoom: 13
}).setView([3.424706, -76.466305], 14)

// Configurar el control de zoom en la esquina superior derecha
map.zoomControl.setPosition('topright')

// Asegurar que el control de zoom mantenga su posición fija
setTimeout(() => {
    const zoomControl = document.querySelector('.leaflet-control-zoom');
    if (zoomControl) {
        zoomControl.style.position = 'fixed';
        zoomControl.style.top = '160px';
        zoomControl.style.left = '20px';
        zoomControl.style.zIndex = '999';
    }
}, 100);

// Definir las capas de mapa
const baseMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
});

const satelliteMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a> &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
});

// Agregar la capa base inicial
baseMap.addTo(map);

// Variable para controlar el estado del mapa
let isSatelliteView = false;

// Variables para medición de distancias
let isMeasuring = false;
let measurePoints = [];
let measureMarkers = [];
let measureLines = [];
let currentMeasureLine = null;

// Variable para almacenar el marcador actual
let currentMarker = null;
let gpsMarker = null;

// Coordenadas iniciales del mapa
const initialView = {
    lat: 3.424706,
    lng: -76.466305,
    zoom: 14
};

// Función para calcular distancia entre dos puntos
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radio de la Tierra en kilómetros
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance;
}

// Función para formatear distancia
function formatDistance(distance) {
    if (distance < 1) {
        return `${(distance * 1000).toFixed(0)}m`;
    } else {
        return `${distance.toFixed(2)}km`;
    }
}

// Función para limpiar mediciones
function clearMeasurements() {
    // Remover marcadores de medición
    measureMarkers.forEach(marker => map.removeLayer(marker));
    measureMarkers = [];
    
    // Remover líneas de medición
    measureLines.forEach(line => map.removeLayer(line));
    measureLines = [];
    
    // Limpiar línea actual
    if (currentMeasureLine) {
        map.removeLayer(currentMeasureLine);
        currentMeasureLine = null;
    }
    
    // Limpiar puntos
    measurePoints = [];
}

// Función para activar/desactivar medición
function toggleMeasurement() {
    const measureBtn = document.getElementById('measure-btn');
    
    if (isMeasuring) {
        // Desactivar medición
        isMeasuring = false;
        measureBtn.classList.remove('active');
        clearMeasurements();
        
        // Restaurar eventos normales del mapa
        map.off('click', onMapClick);
        map.getContainer().style.cursor = '';
        
        // Rehabilitar eventos de clic en capas WFS
        enableWfsLayerInteractions();
        
        console.log('Medición desactivada');
    } else {
        // Activar medición
        isMeasuring = true;
        measureBtn.classList.add('active');
        
        // Limpiar mediciones anteriores
        clearMeasurements();
        
        // Cambiar cursor
        map.getContainer().style.cursor = 'crosshair';
        
        // Deshabilitar eventos de clic en capas WFS
        disableWfsLayerInteractions();
        
        // Agregar evento de clic
        map.on('click', onMapClick);
        
        console.log('Medición activada - Haz clic para agregar puntos');
    }
}

// Función para manejar clics en el mapa durante medición
function onMapClick(e) {
    if (!isMeasuring) return;
    
    // Prevenir propagación del evento
    e.originalEvent.preventDefault();
    e.originalEvent.stopPropagation();
    
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;
    
    // Agregar punto
    measurePoints.push([lat, lng]);
    
    // Crear marcador
    const marker = L.marker([lat, lng], {
        icon: L.divIcon({
            className: 'measure-marker',
            html: measurePoints.length.toString(),
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        })
    }).addTo(map);
    
    measureMarkers.push(marker);
    
    // Mostrar información del punto
    const pointInfo = `
        <b>Punto ${measurePoints.length}</b><br>
        Lat: ${lat.toFixed(6)}<br>
        Lng: ${lng.toFixed(6)}
    `;
    
    marker.bindPopup(pointInfo).openPopup();
    
    // Crear o actualizar línea si hay más de un punto
    if (measurePoints.length > 1) {
        // Remover línea anterior si existe
        if (currentMeasureLine) {
            map.removeLayer(currentMeasureLine);
        }
        
        // Crear nueva línea
        currentMeasureLine = L.polyline(measurePoints, {
            color: '#e74c3c',
            weight: 3,
            opacity: 0.8
        }).addTo(map);
        
        // Calcular distancia total
        let totalDistance = 0;
        for (let i = 1; i < measurePoints.length; i++) {
            const dist = calculateDistance(
                measurePoints[i-1][0], measurePoints[i-1][1],
                measurePoints[i][0], measurePoints[i][1]
            );
            totalDistance += dist;
        }
        
        // Mostrar distancia en popup de la línea
        const popupContent = `
            <b>Medición de Distancia</b><br>
            Puntos: ${measurePoints.length}<br>
            Distancia total: <b>${formatDistance(totalDistance)}</b><br>
            <small>Haz clic para agregar más puntos</small>
        `;
        
        currentMeasureLine.bindPopup(popupContent).openPopup();
        
        // Agregar línea a la lista
        measureLines.push(currentMeasureLine);
        currentMeasureLine = null;
        
        console.log(`Distancia calculada: ${formatDistance(totalDistance)}`);
    }
}

// Función para deshabilitar interacciones de capas WFS durante medición
function disableWfsLayerInteractions() {
    const wfsLayers = [
        wfsEquipamientosEducativos,
        wfsEquipamientosSalud,
        wfsSitiosInteres,
        wfsZonasInundables,
        wfsPuntosReferencia,
        wfsRutas
    ];
    
    wfsLayers.forEach(layer => {
        if (layer) {
            layer.eachLayer(function(layer) {
                layer.off('click');
                layer.options.interactive = false;
            });
        }
    });
}

// Función para rehabilitar interacciones de capas WFS
function enableWfsLayerInteractions() {
    // Recrear las capas WFS con sus eventos originales
    if (wfsEquipamientosEducativos && document.getElementById('toggle-wms-equip-educ').checked) {
        wfsEquipamientosEducativos.eachLayer(function(layer) {
            layer.on('click', function(e) {
                layer.bindPopup('<b>Equipamiento Educativo</b><br>' + (layer.feature.properties.nombre || '')).openPopup();
            });
            layer.options.interactive = true;
        });
    }
    
    if (wfsEquipamientosSalud && document.getElementById('toggle-wms-equip-salud').checked) {
        wfsEquipamientosSalud.eachLayer(function(layer) {
            layer.on('click', function(e) {
                layer.bindPopup('<b>Equipamiento Salud</b><br>' + (layer.feature.properties.nombre || '')).openPopup();
            });
            layer.options.interactive = true;
        });
    }
    
    if (wfsSitiosInteres && document.getElementById('toggle-wms-sitios').checked) {
        wfsSitiosInteres.eachLayer(function(layer) {
            layer.on('click', function(e) {
                layer.bindPopup('<b>Sitio de Interés</b><br>' + (layer.feature.properties.nombre || '')).openPopup();
            });
            layer.options.interactive = true;
        });
    }
    
    if (wfsZonasInundables && document.getElementById('toggle-wms-zonas-inundables').checked) {
        wfsZonasInundables.eachLayer(function(layer) {
            layer.on('click', function(e) {
                layer.bindPopup('<b>Zonas Inundables</b><br>' + getAllPropertiesTable(layer.feature)).openPopup();
            });
            layer.options.interactive = true;
        });
    }
    
    if (wfsPuntosReferencia && document.getElementById('toggle-wms-puntos-ref').checked) {
        wfsPuntosReferencia.eachLayer(function(layer) {
            layer.on('click', function(e) {
                layer.bindPopup('<b>Punto de Referencia</b><br>' + getAllPropertiesTable(layer.feature)).openPopup();
            });
            layer.options.interactive = true;
        });
    }
    
    if (wfsRutas && document.getElementById('toggle-wms-rutas').checked) {
        wfsRutas.eachLayer(function(layer) {
            layer.on('click', function(e) {
                layer.bindPopup('<b>Ruta</b><br>' + getAllPropertiesTable(layer.feature)).openPopup();
            });
            layer.options.interactive = true;
        });
    }
}

// Evento para el botón de medición
document.getElementById('measure-btn').addEventListener('click', toggleMeasurement);

// Función para cambiar entre mapas
function switchMapView() {
    const mapSwitchBtn = document.getElementById('map-switch-btn');
    const mapSwitchIcon = document.querySelector('.map-switch-icon');

    // Remover solo las capas WMS que existen actualmente
    if (map.hasLayer(wmsSitmEstaciones)) {
        map.removeLayer(wmsSitmEstaciones);
    }
    if (map.hasLayer(wmsBarrios)) {
        map.removeLayer(wmsBarrios);
    }
    if (map.hasLayer(wmsConstrucciones)) {
        map.removeLayer(wmsConstrucciones);
    }
    if (map.hasLayer(wmsInundacionFluvial)) {
        map.removeLayer(wmsInundacionFluvial);
    }
    if (map.hasLayer(wmsManzanas)) {
        map.removeLayer(wmsManzanas);
    }
    // No remover capas WFS (GeoJSON), ya que no hay conflicto con el cambio de mapa base

    if (isSatelliteView) {
        // Cambiar a mapa base
        map.removeLayer(satelliteMap);
        baseMap.addTo(map);
        mapSwitchIcon.textContent = '🗺️';
        isSatelliteView = false;
    } else {
        // Cambiar a mapa satelital
        map.removeLayer(baseMap);
        satelliteMap.addTo(map);
        mapSwitchIcon.textContent = '🛰️';
        isSatelliteView = true;
    }

    // Restaurar visibilidad de capas según los checkboxes
    restoreLayerVisibility();
}

// Evento para el botón de cambio de mapa
document.getElementById('map-switch-btn').addEventListener('click', switchMapView);

// Función para volver al inicio
function goHome() {
    // Centrar el mapa en la vista inicial
    map.setView([initialView.lat, initialView.lng], initialView.zoom);
    
    // Remover marcadores de búsqueda
    if (currentMarker) {
        map.removeLayer(currentMarker);
        currentMarker = null;
    }
    
    // Remover marcador GPS
    if (gpsMarker) {
        map.removeLayer(gpsMarker);
        gpsMarker = null;
    }
    
    // Limpiar mediciones si están activas
    if (isMeasuring) {
        clearMeasurements();
    }
    
    // Limpiar el campo de búsqueda
    document.getElementById('search-box').value = '';
    
    console.log('Vuelto a la vista inicial');
}

// Evento para el botón Home
document.getElementById('home-btn').addEventListener('click', goHome);

// Función para actualizar la escala según el zoom
function updateScale() {
    const zoom = map.getZoom();
    const center = map.getCenter();
    const lat = center.lat;
    
    // Calcular la distancia en metros según el zoom
    let distance, unit;
    if (zoom >= 18) {
        distance = 50;
        unit = 'm';
    } else if (zoom >= 16) {
        distance = 100;
        unit = 'm';
    } else if (zoom >= 14) {
        distance = 500;
        unit = 'm';
    } else if (zoom >= 12) {
        distance = 1;
        unit = 'km';
    } else if (zoom >= 10) {
        distance = 5;
        unit = 'km';
    } else {
        distance = 10;
        unit = 'km';
    }
    
    // Actualizar las etiquetas de la escala
    const scaleStart = document.querySelector('.scale-start');
    const scaleEnd = document.querySelector('.scale-end');
    
    if (scaleStart && scaleEnd) {
        scaleStart.textContent = '0';
        scaleEnd.textContent = `${distance}${unit}`;
    }
}

// Actualizar escala cuando cambie el zoom
map.on('zoomend', updateScale);

// Actualizar escala inicial
setTimeout(updateScale, 100);

// Función para obtener la ubicación GPS
function getCurrentLocation() {
    const gpsBtn = document.getElementById('gps-btn');
    const gpsIcon = document.querySelector('.gps-icon');
    
    // Mostrar estado de carga
    gpsBtn.classList.add('loading');
    gpsIcon.textContent = '⏳';
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const accuracy = position.coords.accuracy;
                
                // Centrar el mapa en la ubicación del usuario
                map.setView([lat, lng], 18);
                
                // Remover marcador GPS anterior si existe
                if (gpsMarker) {
                    map.removeLayer(gpsMarker);
                }
                
                // Crear marcador personalizado para GPS
                const gpsIcon = L.divIcon({
                    className: 'gps-marker',
                    html: '📍',
                    iconSize: [30, 30],
                    iconAnchor: [15, 15]
                });
                
                // Agregar marcador GPS
                gpsMarker = L.marker([lat, lng], {icon: gpsIcon}).addTo(map);
                
                // Mostrar información en popup
                gpsMarker.bindPopup(`
                    <b>Tu ubicación actual</b><br>
                    Latitud: ${lat.toFixed(6)}<br>
                    Longitud: ${lng.toFixed(6)}<br>
                    Precisión: ±${Math.round(accuracy)}m
                `).openPopup();
                
                // Restaurar botón
                gpsBtn.classList.remove('loading');
                document.querySelector('.gps-icon').textContent = '●';
                
                console.log('Ubicación obtenida:', {lat, lng, accuracy});
            },
            function(error) {
                // Manejar errores
                let errorMessage = 'Error al obtener la ubicación: ';
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage += 'Permiso denegado.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage += 'Información de ubicación no disponible.';
                        break;
                    case error.TIMEOUT:
                        errorMessage += 'Tiempo de espera agotado.';
                        break;
                    default:
                        errorMessage += 'Error desconocido.';
                        break;
                }
                
                alert(errorMessage);
                
                // Restaurar botón
                gpsBtn.classList.remove('loading');
                document.querySelector('.gps-icon').textContent = '●';
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    } else {
        alert('La geolocalización no está soportada en este navegador.');
        gpsBtn.classList.remove('loading');
        document.querySelector('.gps-icon').textContent = '●';
    }
}

// Evento para el botón GPS
document.getElementById('gps-btn').addEventListener('click', getCurrentLocation);

// Función para buscar direcciones en Cali
async function searchAddress(address) {
    try {
        // Construir la URL de búsqueda limitada a Cali, Valle del Cauca, Colombia
        const searchQuery = `${address}, Cali, Valle del Cauca, Colombia`;
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&countrycodes=co&addressdetails=1`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.length > 0) {
            // Tomar el primer resultado
            const result = data[0];
            const lat = parseFloat(result.lat);
            const lon = parseFloat(result.lon);
            
            // Centrar el mapa en la ubicación encontrada
            map.setView([lat, lon], 18);
            
            // Remover marcador anterior si existe
            if (currentMarker) {
                map.removeLayer(currentMarker);
            }
            
            // Agregar nuevo marcador
            currentMarker = L.marker([lat, lon]).addTo(map);
            
            // Mostrar información en un popup
            const displayName = result.display_name.split(',')[0]; // Tomar solo la primera parte
            currentMarker.bindPopup(`<b>${displayName}</b><br>${result.display_name}`).openPopup();
            
            return true;
        } else {
            alert('No se encontró la dirección especificada en Cali, Valle del Cauca.');
            return false;
        }
    } catch (error) {
        console.error('Error en la búsqueda:', error);
        alert('Error al buscar la dirección. Por favor, intenta de nuevo.');
        return false;
    }
}

// Funcionalidad del buscador
document.getElementById('search-btn').addEventListener('click', async function() {
    const searchTerm = document.getElementById('search-box').value;
    if (searchTerm.trim() !== '') {
        // Mostrar indicador de carga
        const searchBtn = document.getElementById('search-btn');
        const originalText = searchBtn.textContent;
        searchBtn.textContent = 'Buscando...';
        searchBtn.disabled = true;
        
        // Realizar búsqueda
        await searchAddress(searchTerm);
        
        // Restaurar botón
        searchBtn.textContent = originalText;
        searchBtn.disabled = false;
    } else {
        alert('Por favor, ingresa una dirección para buscar.');
    }
});

// Permitir búsqueda con Enter
document.getElementById('search-box').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        document.getElementById('search-btn').click();
    }
});

// --- CARGA DE GEOJSONS PARA VISUALIZACIÓN ---
// Referencias globales a las capas GeoJSON
let layerComuna21 = null;
let layerComunasAledanas = null;
let layerNavarro = null;
let layerRioCauca = null;

// Función para agregar un GeoJSON al mapa y devolver la capa
function createGeoJsonLayer(url, style) {
    let geoJsonLayer = null;
    fetch(url)
        .then(response => response.json())
        .then(data => {
            geoJsonLayer = L.geoJSON(data, {
                style: style,
                onEachFeature: function (feature, layer) {
                    layer.on({
                        click: function(e) {
                            e.originalEvent.preventDefault();
                            e.originalEvent.stopPropagation();
                        }
                    });
                },
                interactive: false
            });
            geoJsonLayer.addTo(map);
            // Guardar la referencia global
            if (url.includes('comuna_21')) layerComuna21 = geoJsonLayer;
            if (url.includes('comunas_aledañas')) layerComunasAledanas = geoJsonLayer;
            if (url.includes('navarro')) layerNavarro = geoJsonLayer;
            if (url.includes('rio_cauca')) layerRioCauca = geoJsonLayer;
        });
}

// Estilos para cada capa
const styleComuna21 = {
    color: '#e67e22',
    weight: 2,
    fillOpacity: 0
};
const styleComunasAledanas = {
    color: '#2980b9',
    weight: 2,
    fillOpacity: 0.1,
    dashArray: '4'
};
const styleNavarro = {
    color: '#27ae60',
    weight: 2,
    fillOpacity: 0.15
};
const styleRioCauca = {
    color: '#3498db',
    weight: 3
};

// Crear y agregar capas GeoJSON al mapa
createGeoJsonLayer('geojson/comunas_aledañas.geojson', styleComunasAledanas);
createGeoJsonLayer('geojson/navarro.geojson', styleNavarro);
createGeoJsonLayer('geojson/rio_cauca.geojson', styleRioCauca);
createGeoJsonLayer('geojson/comuna_21.geojson', styleComuna21);

// --- CONTROL DE CAPAS: VINCULAR CHECKBOXES ---
function setupLayerToggles() {
    // Esperar a que las capas GeoJSON estén cargadas
    const waitForLayers = setInterval(() => {
        if (layerComuna21 && layerComunasAledanas && layerNavarro && layerRioCauca) {
            clearInterval(waitForLayers);
            // GeoJSON
            document.getElementById('toggle-comuna21').addEventListener('change', function(e) {
                if (e.target.checked) {
                    map.addLayer(layerComuna21);
                } else {
                    map.removeLayer(layerComuna21);
                }
            });
            document.getElementById('toggle-comunas-aledanas').addEventListener('change', function(e) {
                if (e.target.checked) {
                    map.addLayer(layerComunasAledanas);
                } else {
                    map.removeLayer(layerComunasAledanas);
                }
            });
            document.getElementById('toggle-navarro').addEventListener('change', function(e) {
                if (e.target.checked) {
                    map.addLayer(layerNavarro);
                } else {
                    map.removeLayer(layerNavarro);
                }
            });
            document.getElementById('toggle-rio-cauca').addEventListener('change', function(e) {
                if (e.target.checked) {
                    map.addLayer(layerRioCauca);
                } else {
                    map.removeLayer(layerRioCauca);
                }
            });
            // WMS
            document.getElementById('toggle-wms-barrios').addEventListener('change', function(e) {
                if (e.target.checked) {
                    map.addLayer(wmsBarrios);
                } else {
                    map.removeLayer(wmsBarrios);
                }
            });
            document.getElementById('toggle-wms-construcciones').addEventListener('change', function(e) {
                if (e.target.checked) {
                    map.addLayer(wmsConstrucciones);
                } else {
                    map.removeLayer(wmsConstrucciones);
                }
            });
            document.getElementById('toggle-wms-inundacion').addEventListener('change', function(e) {
                if (e.target.checked) {
                    map.addLayer(wmsInundacionFluvial);
                } else {
                    map.removeLayer(wmsInundacionFluvial);
                }
            });
            document.getElementById('toggle-wms-manzanas').addEventListener('change', function(e) {
                if (e.target.checked) {
                    map.addLayer(wmsManzanas);
                } else {
                    map.removeLayer(wmsManzanas);
                }
            });
            // WFS (GeoJSON)
            document.getElementById('toggle-wms-equip-educ').addEventListener('change', function(e) {
                if (wfsEquipamientosEducativos) {
                if (e.target.checked) {
                        map.addLayer(wfsEquipamientosEducativos);
                } else {
                        map.removeLayer(wfsEquipamientosEducativos);
                    }
                }
            });
            document.getElementById('toggle-wms-equip-salud').addEventListener('change', function(e) {
                if (wfsEquipamientosSalud) {
                if (e.target.checked) {
                        map.addLayer(wfsEquipamientosSalud);
                } else {
                        map.removeLayer(wfsEquipamientosSalud);
                    }
                }
            });
            document.getElementById('toggle-wms-sitios').addEventListener('change', function(e) {
                if (wfsSitiosInteres) {
                if (e.target.checked) {
                        map.addLayer(wfsSitiosInteres);
                } else {
                        map.removeLayer(wfsSitiosInteres);
                    }
                }
            });
            document.getElementById('toggle-wms-zonas-inundables').addEventListener('change', function(e) {
                if (wfsZonasInundables) {
                if (e.target.checked) {
                        map.addLayer(wfsZonasInundables);
                } else {
                        map.removeLayer(wfsZonasInundables);
                    }
                }
            });
            document.getElementById('toggle-wms-puntos-ref').addEventListener('change', function(e) {
                if (wfsPuntosReferencia) {
                if (e.target.checked) {
                        map.addLayer(wfsPuntosReferencia);
                } else {
                        map.removeLayer(wfsPuntosReferencia);
                    }
                }
            });
            document.getElementById('toggle-wms-rutas').addEventListener('change', function(e) {
                if (wfsRutas) {
                if (e.target.checked) {
                        map.addLayer(wfsRutas);
                } else {
                        map.removeLayer(wfsRutas);
                    }
                }
            });
            document.getElementById('toggle-wms-sitm-estaciones').addEventListener('change', function(e) {
                if (e.target.checked) {
                    map.addLayer(wmsSitmEstaciones);
                } else {
                    map.removeLayer(wmsSitmEstaciones);
                }
            });
        }
    }, 100);
}
setupLayerToggles();

// Función para restaurar visibilidad de capas según los checkboxes
function restoreLayerVisibility() {
    // GeoJSON
    if (document.getElementById('toggle-comuna21').checked) {
        map.addLayer(layerComuna21);
    } else {
        map.removeLayer(layerComuna21);
    }
    if (document.getElementById('toggle-comunas-aledanas').checked) {
        map.addLayer(layerComunasAledanas);
    } else {
        map.removeLayer(layerComunasAledanas);
    }
    if (document.getElementById('toggle-navarro').checked) {
        map.addLayer(layerNavarro);
    } else {
        map.removeLayer(layerNavarro);
    }
    if (document.getElementById('toggle-rio-cauca').checked) {
        map.addLayer(layerRioCauca);
    } else {
        map.removeLayer(layerRioCauca);
    }
    // WMS
    if (document.getElementById('toggle-wms-barrios').checked) {
        map.addLayer(wmsBarrios);
    } else {
        map.removeLayer(wmsBarrios);
    }
    if (document.getElementById('toggle-wms-construcciones').checked) {
        map.addLayer(wmsConstrucciones);
    } else {
        map.removeLayer(wmsConstrucciones);
    }
    if (document.getElementById('toggle-wms-inundacion').checked) {
        map.addLayer(wmsInundacionFluvial);
    } else {
        map.removeLayer(wmsInundacionFluvial);
    }
    if (document.getElementById('toggle-wms-manzanas').checked) {
        map.addLayer(wmsManzanas);
    } else {
        map.removeLayer(wmsManzanas);
    }
    if (document.getElementById('toggle-wms-equip-educ').checked) {
        map.addLayer(wfsEquipamientosEducativos);
    } else {
        map.removeLayer(wfsEquipamientosEducativos);
    }
    if (document.getElementById('toggle-wms-equip-salud').checked) {
        map.addLayer(wfsEquipamientosSalud);
    } else {
        map.removeLayer(wfsEquipamientosSalud);
    }
    if (document.getElementById('toggle-wms-sitios').checked) {
        map.addLayer(wfsSitiosInteres);
    } else {
        map.removeLayer(wfsSitiosInteres);
    }
    if (document.getElementById('toggle-wms-zonas-inundables').checked) {
        map.addLayer(wfsZonasInundables);
    } else {
        map.removeLayer(wfsZonasInundables);
    }
    if (document.getElementById('toggle-wms-puntos-ref').checked) {
        map.addLayer(wfsPuntosReferencia);
    } else {
        map.removeLayer(wfsPuntosReferencia);
    }
    if (document.getElementById('toggle-wms-rutas').checked) {
        map.addLayer(wfsRutas);
    } else {
        map.removeLayer(wfsRutas);
    }
    if (document.getElementById('toggle-wms-sitm-estaciones').checked) {
        map.addLayer(wmsSitmEstaciones);
    } else {
        map.removeLayer(wmsSitmEstaciones);
    }
}

// --- Capa WMS: SITM Estaciones (solo visualización) ---
// Servicio WMS: https://ws-idesc.cali.gov.co/geoserver/wms?service=WMS&
// Capa: metrocali:sitm_estaciones
// SRC: 6249 (EPSG:6249)
const wmsSitmEstaciones = L.tileLayer.wms('https://ws-idesc.cali.gov.co/geoserver/wms?', {
    layers: 'metrocali:sitm_estaciones',
    format: 'image/png',
    transparent: true,
    version: '1.1.1',
    crs: L.CRS.EPSG6249 || L.CRS.EPSG3857, // Fallback a 3857 si 6249 no está definido en Leaflet
    attribution: '', // Sin leyenda ni atribución visual
    // No se agrega leyenda ni control de capa
});
wmsSitmEstaciones.addTo(map);

// --- Capa WMS: Barrios (TALLER3sig3) ---
// Servicio WMS: http://44.198.27.212:8080/geoserver/TALLER3sig3/wms
// Capa: barrios
// SRC: 4326 (EPSG:4326)
const wmsBarrios = L.tileLayer.wms('http://44.198.27.212:8080/geoserver/TALLER3sig3/wms?', {
    layers: 'barrios',
    format: 'image/png',
    transparent: true,
    version: '1.1.1',
    crs: L.CRS.EPSG4326,
    attribution: 'Barrios - TALLER3sig3',
    opacity: 0.7 // Ajusta la opacidad según necesites
});
wmsBarrios.addTo(map);

// --- Capa WMS: Construcciones (TALLER3sig3) ---
// Servicio WMS: http://44.198.27.212:8080/geoserver/TALLER3sig3/wms
// Capa: construcciones
// SRC: 4326 (EPSG:4326)
const wmsConstrucciones = L.tileLayer.wms('http://44.198.27.212:8080/geoserver/TALLER3sig3/wms?', {
    layers: 'construcciones',
    format: 'image/png',
    transparent: true,
    version: '1.1.1',
    crs: L.CRS.EPSG4326,
    attribution: 'Construcciones - TALLER3sig3',
    opacity: 0.8 // Ajusta la opacidad según necesites
});
wmsConstrucciones.addTo(map);

// --- Capa WMS: Inundación Fluvial (TALLER3sig3) ---
// Servicio WMS: http://44.198.27.212:8080/geoserver/TALLER3sig3/wms
// Capa: inundacion_fluvial
// SRC: 4326 (EPSG:4326)
const wmsInundacionFluvial = L.tileLayer.wms('http://44.198.27.212:8080/geoserver/TALLER3sig3/wms?', {
    layers: 'inundacion_fluvial',
    format: 'image/png',
    transparent: true,
    version: '1.1.1',
    crs: L.CRS.EPSG4326,
    attribution: 'Inundación Fluvial - TALLER3sig3',
    opacity: 0.6 // Ajusta la opacidad según necesites
});
wmsInundacionFluvial.addTo(map);

// --- Capa WMS: Manzanas (TALLER3sig3) ---
// Servicio WMS: http://44.198.27.212:8080/geoserver/TALLER3sig3/wms
// Capa: manzanas
// SRC: 4326 (EPSG:4326)
const wmsManzanas = L.tileLayer.wms('http://44.198.27.212:8080/geoserver/TALLER3sig3/wms?', {
    layers: 'manzanas',
    format: 'image/png',
    transparent: true,
    version: '1.1.1',
    crs: L.CRS.EPSG4326,
    attribution: 'Manzanas - TALLER3sig3',
    opacity: 0.4 // Ajusta la opacidad según necesites
});
wmsManzanas.addTo(map);

// --- Capa WMS: Equipamientos Educativos (TALLER3sig3) ---
// Servicio WMS: http://44.198.27.212:8080/geoserver/TALLER3sig3/wms
// Capa: equipamientos_educativos
// SRC: 4326 (EPSG:4326)
// const wmsEquipamientosEducativos = L.tileLayer.wms('http://44.198.27.212:8080/geoserver/TALLER3sig3/wms?', {
//     layers: 'equipamientos_educativos',
//     format: 'image/png',
//     transparent: true,
//     version: '1.1.1',
//     crs: L.CRS.EPSG4326,
//     attribution: 'Equipamientos Educativos - TALLER3sig3',
//     opacity: 0.9 // Ajusta la opacidad según necesites
// });
// wmsEquipamientosEducativos.addTo(map);

// --- Capa WFS: Equipamientos Educativos (GeoJSON) ---
let wfsEquipamientosEducativos = null;
function loadWfsEquipamientosEducativos() {
    fetch('http://44.198.27.212:8080/geoserver/TALLER3sig3/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=TALLER3sig3:equipamientos_educativos&outputFormat=application/json')
        .then(response => {
            if (!response.ok) throw new Error('CORS o error de red');
            return response.json();
        })
        .then(data => {
            wfsEquipamientosEducativos = L.geoJSON(data, {
                pointToLayer: function (feature, latlng) {
                    return L.circleMarker(latlng, {
                        radius: 7,
                        fillColor: '#f1c40f',
                        color: '#e67e22',
                        weight: 2,
                        opacity: 1,
                        fillOpacity: 0.9
                    });
                },
                onEachFeature: function (feature, layer) {
                    layer.bindPopup('<b>Equipamiento Educativo</b><br>' + (feature.properties.nombre || ''));
                }
            });
            if (document.getElementById('toggle-wms-equip-educ').checked) {
                wfsEquipamientosEducativos.addTo(map);
            }
        })
        .catch(err => {
            alert('No se pudo cargar la capa Equipamientos Educativos (WFS). Puede ser un problema de CORS.');
        });
}
loadWfsEquipamientosEducativos();

// --- Capa WMS: Equipamientos de Salud (TALLER3sig3) ---
// Servicio WMS: http://44.198.27.212:8080/geoserver/TALLER3sig3/wms
// Capa: equipamientos_salud
// SRC: 4326 (EPSG:4326)
// const wmsEquipamientosSalud = L.tileLayer.wms('http://44.198.27.212:8080/geoserver/TALLER3sig3/wms?', {
//     layers: 'equipamientos_salud',
//     format: 'image/png',
//     transparent: true,
//     version: '1.1.1',
//     crs: L.CRS.EPSG4326,
//     attribution: 'Equipamientos de Salud - TALLER3sig3',
//     opacity: 0.9 // Ajusta la opacidad según necesites
// });
// wmsEquipamientosSalud.addTo(map);

let wfsEquipamientosSalud = null;
function loadWfsEquipamientosSalud() {
    fetch('http://44.198.27.212:8080/geoserver/TALLER3sig3/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=TALLER3sig3:equipamientos_salud&outputFormat=application/json')
        .then(response => {
            if (!response.ok) throw new Error('CORS o error de red');
            return response.json();
        })
        .then(data => {
            wfsEquipamientosSalud = L.geoJSON(data, {
                pointToLayer: function (feature, latlng) {
                    return L.circleMarker(latlng, {
                        radius: 7,
                        fillColor: '#e74c3c',
                        color: '#c0392b',
                        weight: 2,
                        opacity: 1,
                        fillOpacity: 0.9
                    });
                },
                onEachFeature: function (feature, layer) {
                    layer.bindPopup('<b>Equipamiento Salud</b><br>' + (feature.properties.nombre || ''));
                }
            });
            if (document.getElementById('toggle-wms-equip-salud').checked) {
                wfsEquipamientosSalud.addTo(map);
            }
        })
        .catch(err => {
            alert('No se pudo cargar la capa Equipamientos Salud (WFS). Puede ser un problema de CORS.');
        });
}
loadWfsEquipamientosSalud();

// --- Capa WMS: Sitios de Interés (TALLER3sig3) ---
// Servicio WMS: http://44.198.27.212:8080/geoserver/TALLER3sig3/wms
// Capa: sitios_interes
// SRC: 4326 (EPSG:4326)
// const wmsSitiosInteres = L.tileLayer.wms('http://44.198.27.212:8080/geoserver/TALLER3sig3/wms?', {
//     layers: 'sitios_interes',
//     format: 'image/png',
//     transparent: true,
//     version: '1.1.1',
//     crs: L.CRS.EPSG4326,
//     attribution: 'Sitios de Interés - TALLER3sig3',
//     opacity: 0.9 // Ajusta la opacidad según necesites
// });
// wmsSitiosInteres.addTo(map);

let wfsSitiosInteres = null;
function loadWfsSitiosInteres() {
    fetch('http://44.198.27.212:8080/geoserver/TALLER3sig3/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=TALLER3sig3:sitios_interes&outputFormat=application/json')
        .then(response => {
            if (!response.ok) throw new Error('CORS o error de red');
            return response.json();
        })
        .then(data => {
            wfsSitiosInteres = L.geoJSON(data, {
                pointToLayer: function (feature, latlng) {
                    return L.circleMarker(latlng, {
                        radius: 7,
                        fillColor: '#8e44ad',
                        color: '#5e3370',
                        weight: 2,
                        opacity: 1,
                        fillOpacity: 0.9
                    });
                },
                onEachFeature: function (feature, layer) {
                    layer.bindPopup('<b>Sitio de Interés</b><br>' + (feature.properties.nombre || ''));
                }
            });
            if (document.getElementById('toggle-wms-sitios').checked) {
                wfsSitiosInteres.addTo(map);
            }
        })
        .catch(err => {
            alert('No se pudo cargar la capa Sitios de Interés (WFS). Puede ser un problema de CORS.');
        });
}
loadWfsSitiosInteres();

// Utilidad para mostrar todos los atributos de un feature en una tabla
function getAllPropertiesTable(feature) {
    if (!feature.properties) return '';
    let html = '<table style="font-size:12px;">';
    for (const key in feature.properties) {
        if (Object.prototype.hasOwnProperty.call(feature.properties, key)) {
            html += `<tr><td style='font-weight:bold;padding-right:6px;'>${key}</td><td>${feature.properties[key]}</td></tr>`;
        }
    }
    html += '</table>';
    return html;
}

// --- Capa WFS: Zonas Inundables (GeoJSON) ---
let wfsZonasInundables = null;
function loadWfsZonasInundables() {
    fetch('http://44.198.27.212:8080/geoserver/TALLER3sig3/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=TALLER3sig3:zonas_inundables&outputFormat=application/json')
        .then(response => {
            if (!response.ok) throw new Error('CORS o error de red');
            return response.json();
        })
        .then(data => {
            wfsZonasInundables = L.geoJSON(data, {
                style: {
                    color: '#16a085',
                    weight: 2,
                    fillOpacity: 0.3
                },
                onEachFeature: function (feature, layer) {
                    layer.bindPopup('<b>Zonas Inundables</b><br>' + getAllPropertiesTable(feature));
                }
            });
            if (document.getElementById('toggle-wms-zonas-inundables').checked) {
                wfsZonasInundables.addTo(map);
            }
        })
        .catch(err => {
            alert('No se pudo cargar la capa Zonas Inundables (WFS). Puede ser un problema de CORS.');
        });
}
loadWfsZonasInundables();

// --- Capa WFS: Puntos de Referencia (GeoJSON) ---
let wfsPuntosReferencia = null;
function loadWfsPuntosReferencia() {
    fetch('http://44.198.27.212:8080/geoserver/TALLER3sig3/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=TALLER3sig3:puntos_referencia&outputFormat=application/json')
        .then(response => {
            if (!response.ok) throw new Error('CORS o error de red');
            return response.json();
        })
        .then(data => {
            wfsPuntosReferencia = L.geoJSON(data, {
                pointToLayer: function (feature, latlng) {
                    return L.circleMarker(latlng, {
                        radius: 6,
                        fillColor: '#34495e',
                        color: '#222',
                        weight: 2,
                        opacity: 1,
                        fillOpacity: 0.9
                    });
                },
                onEachFeature: function (feature, layer) {
                    layer.bindPopup('<b>Punto de Referencia</b><br>' + getAllPropertiesTable(feature));
                }
            });
            if (document.getElementById('toggle-wms-puntos-ref').checked) {
                wfsPuntosReferencia.addTo(map);
            }
        })
        .catch(err => {
            alert('No se pudo cargar la capa Puntos de Referencia (WFS). Puede ser un problema de CORS.');
        });
}
loadWfsPuntosReferencia();

// --- Capa WFS: Rutas (GeoJSON) ---
let wfsRutas = null;
function loadWfsRutas() {
    fetch('http://44.198.27.212:8080/geoserver/TALLER3sig3/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=TALLER3sig3:rutas&outputFormat=application/json')
        .then(response => {
            if (!response.ok) throw new Error('CORS o error de red');
            return response.json();
        })
        .then(data => {
            wfsRutas = L.geoJSON(data, {
                style: {
                    color: '#e67e22',
                    weight: 4,
                    opacity: 0.8
                },
                onEachFeature: function (feature, layer) {
                    layer.bindPopup('<b>Ruta</b><br>' + getAllPropertiesTable(feature));
                }
            });
            if (document.getElementById('toggle-wms-rutas').checked) {
                wfsRutas.addTo(map);
            }
        })
        .catch(err => {
            alert('No se pudo cargar la capa Rutas (WFS). Puede ser un problema de CORS.');
        });
}
loadWfsRutas();

// --- LEYENDA DE CAPAS ---
function renderLegend() {
    const legendContent = document.getElementById('legend-content');
    legendContent.innerHTML = `
        <div class="legend-item">
            <span class="legend-symbol" style="background: none; border: 2px solid #e67e22;"></span>
            Comuna 21
        </div>
        <div class="legend-item">
            <span class="legend-symbol" style="background: #2980b9; opacity: 0.1; border: 2px dashed #2980b9;"></span>
            Comunas aledañas
        </div>
        <div class="legend-item">
            <span class="legend-symbol" style="background: #27ae60; opacity: 0.15; border: 2px solid #27ae60;"></span>
            Navarro
        </div>
        <div class="legend-item">
            <span class="legend-line" style="background: #3498db; height: 4px;"></span>
            Río Cauca
        </div>
        <hr style="margin: 8px 0;">
        <div class="legend-item">
            <img src="http://44.198.27.212:8080/geoserver/TALLER3sig3/wms?REQUEST=GetLegendGraphic&VERSION=1.0.0&FORMAT=image/png&LAYER=barrios" alt="Barrios" style="height:18px;"> Barrios
        </div>
        <div class="legend-item">
            <img src="http://44.198.27.212:8080/geoserver/TALLER3sig3/wms?REQUEST=GetLegendGraphic&VERSION=1.0.0&FORMAT=image/png&LAYER=construcciones" alt="Construcciones" style="height:18px;"> Construcciones
        </div>
        <div class="legend-item">
            <img src="http://44.198.27.212:8080/geoserver/TALLER3sig3/wms?REQUEST=GetLegendGraphic&VERSION=1.0.0&FORMAT=image/png&LAYER=inundacion_fluvial" alt="Inundación Fluvial" style="height:18px;"> Inundación Fluvial
        </div>
        <div class="legend-item">
            <img src="http://44.198.27.212:8080/geoserver/TALLER3sig3/wms?REQUEST=GetLegendGraphic&VERSION=1.0.0&FORMAT=image/png&LAYER=manzanas" alt="Manzanas" style="height:18px;"> Manzanas
        </div>
        <div class="legend-item">
            <span class="legend-symbol" style="display:inline-block;width:18px;height:18px;border-radius:50%;background:#f1c40f;border:2px solid #e67e22;margin-right:6px;"></span>
            Equipamientos Educativos
        </div>
        <div class="legend-item">
            <span class="legend-symbol" style="display:inline-block;width:18px;height:18px;border-radius:50%;background:#e74c3c;border:2px solid #c0392b;margin-right:6px;"></span>
            Equipamientos Salud
        </div>
        <div class="legend-item">
            <span class="legend-symbol" style="display:inline-block;width:18px;height:18px;border-radius:50%;background:#8e44ad;border:2px solid #5e3370;margin-right:6px;"></span>
            Sitios de Interés
        </div>
        <div class="legend-item">
            <span class="legend-symbol" style="display:inline-block;width:24px;height:14px;border-radius:3px;background:#16a085;opacity:0.3;border:2px solid #16a085;margin-right:6px;"></span>
            Zonas Inundables
        </div>
        <div class="legend-item">
            <span class="legend-symbol" style="display:inline-block;width:14px;height:14px;border-radius:50%;background:#34495e;border:2px solid #222;margin-right:6px;"></span>
            Puntos de Referencia
        </div>
        <div class="legend-item">
            <span class="legend-line" style="background: #e67e22; height: 4px; width:28px; display:inline-block; border-radius:2px; margin-right:6px;"></span>
            Rutas
        </div>
        <div class="legend-item">
            <img src="https://ws-idesc.cali.gov.co/geoserver/wms?REQUEST=GetLegendGraphic&VERSION=1.0.0&FORMAT=image/png&LAYER=metrocali:sitm_estaciones" alt="SITM Estaciones" style="height:18px;"> SITM Estaciones
        </div>
    `;
}
renderLegend();

// --- FUNCIONALIDAD DEL FORMULARIO EN DIVISIÓN 1 ---
function handleTablaSelectorChange() {
    const selectedValue = document.getElementById('tabla-selector').value;
    const formContainer = document.getElementById('form-container');
    const formRutasContainer = document.getElementById('form-rutas-container');
    const formZonasContainer = document.getElementById('form-zonas-container');
    
    // Ocultar todos los formularios primero
    formContainer.style.display = 'none';
    formRutasContainer.style.display = 'none';
    formZonasContainer.style.display = 'none';
    
    // Limpiar todos los campos
    clearAllFormFields();
    
    // Mostrar el formulario correspondiente
    if (selectedValue === 'puntos_referencia') {
        formContainer.style.display = 'block';
    } else if (selectedValue === 'rutas') {
        formRutasContainer.style.display = 'block';
    } else if (selectedValue === 'zonas_inundables') {
        formZonasContainer.style.display = 'block';
    }
}

// Función para limpiar todos los campos de formulario
function clearAllFormFields() {
    // Limpiar campos de puntos_referencia
    document.getElementById('descripcion').value = '';
    document.getElementById('barrio').value = '';
    document.getElementById('estado').value = '';
    
    // Limpiar campos de rutas
    document.getElementById('descripcion-rutas').value = '';
    document.getElementById('tipo-ruta').value = '';
    
    // Limpiar campos de zonas_inundables
    document.getElementById('descripcion-zonas').value = '';
}

// Evento para el selector de tabla
document.getElementById('tabla-selector').addEventListener('change', handleTablaSelectorChange);

// Evento para el selector de tabla de la División 2
document.getElementById('tabla-selector-2').addEventListener('change', function() {
    const selectedValue = this.value;
    const formUpdatePuntos = document.getElementById('form-update-puntos');
    const formUpdateRutas = document.getElementById('form-update-rutas');
    const formUpdateZonas = document.getElementById('form-update-zonas');
    
    // Ocultar todos los formularios primero
    formUpdatePuntos.style.display = 'none';
    formUpdateRutas.style.display = 'none';
    formUpdateZonas.style.display = 'none';
    
    // Limpiar todos los campos
    clearAllUpdateFormFields();
    
    // Mostrar el formulario correspondiente
    if (selectedValue === 'puntos_referencia') {
        formUpdatePuntos.style.display = 'block';
    } else if (selectedValue === 'rutas') {
        formUpdateRutas.style.display = 'block';
    } else if (selectedValue === 'zonas_inundables') {
        formUpdateZonas.style.display = 'block';
    }
    
    console.log('División 2 - Tabla seleccionada:', selectedValue);
});

// Función para limpiar todos los campos de formulario de actualización
function clearAllUpdateFormFields() {
    // Limpiar campos de puntos_referencia
    document.getElementById('id-update-puntos').value = '';
    document.getElementById('descripcion-update-puntos').value = '';
    document.getElementById('barrio-update-puntos').value = '';
    document.getElementById('estado-update-puntos').value = '';
    
    // Limpiar campos de rutas
    document.getElementById('id-update-rutas').value = '';
    document.getElementById('descripcion-update-rutas').value = '';
    document.getElementById('tipo-update-ruta').value = '';
    
    // Limpiar campos de zonas_inundables
    document.getElementById('id_zona').value = '';
    document.getElementById('descripcion-update-zonas').value = '';
}

// --- FUNCIONALIDAD DE LOS BOTONES DEL FORMULARIO ---
let isPlacingPoint = false;

// Función para colocar punto en el mapa
function colocarPunto() {
    const descripcion = document.getElementById('descripcion').value;
    const barrio = document.getElementById('barrio').value;
    const estado = document.getElementById('estado').value;
    
    if (!descripcion || !barrio || !estado) {
        alert('Por favor, complete todos los campos antes de colocar el punto.');
        return;
    }
    
    isPlacingPoint = true;
    document.getElementById('colocar-punto-btn').classList.add('active');
    map.getContainer().style.cursor = 'crosshair';
    
    // Agregar evento de clic temporal al mapa
    map.once('click', function(e) {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;
        
        // Crear marcador personalizado
        const marker = L.marker([lat, lng], {
            icon: L.divIcon({
                className: 'custom-point-marker',
                html: '📍',
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            })
        }).addTo(map);
        
        // Mostrar información en popup
        const popupContent = `
            <b>Punto de Referencia</b><br>
            <b>Descripción:</b> ${descripcion}<br>
            <b>Barrio:</b> ${barrio}<br>
            <b>Estado:</b> ${estado}<br>
            <b>Coordenadas:</b><br>
            Lat: ${lat.toFixed(6)}<br>
            Lng: ${lng.toFixed(6)}
        `;
        
        marker.bindPopup(popupContent).openPopup();
        
        // Restaurar estado
        isPlacingPoint = false;
        document.getElementById('colocar-punto-btn').classList.remove('active');
        map.getContainer().style.cursor = '';
        
        console.log('Punto colocado:', {lat, lng, descripcion, barrio, estado});
    });
}

// Función para adicionar punto (guardar en algún lugar)
function adicionarPunto() {
    const descripcion = document.getElementById('descripcion').value;
    const barrio = document.getElementById('barrio').value;
    const estado = document.getElementById('estado').value;
    
    if (!descripcion || !barrio || !estado) {
        alert('Por favor, complete todos los campos antes de adicionar.');
        return;
    }
    
    // Aquí puedes agregar la lógica para guardar los datos
    // Por ejemplo, enviar a una base de datos o almacenar localmente
    const puntoData = {
        descripcion: descripcion,
        barrio: barrio,
        estado: estado,
        fecha: new Date().toISOString()
    };
    
    console.log('Datos del punto a adicionar:', puntoData);
    alert('Punto adicionado correctamente!');
    
    // Limpiar formulario después de adicionar
    clearAllFormFields();
}

// Eventos para los botones
document.getElementById('colocar-punto-btn').addEventListener('click', colocarPunto);
document.getElementById('adicionar-btn').addEventListener('click', adicionarPunto);

// --- FUNCIONALIDAD DE LOS BOTONES DE RUTAS ---
let isTracingRoute = false;
let routePoints = [];
let routeMarkers = [];
let currentRouteLine = null;

// Función para trazar ruta en el mapa
function traceRuta() {
    const descripcion = document.getElementById('descripcion-rutas').value;
    const tipo = document.getElementById('tipo-ruta').value;
    
    if (!descripcion || !tipo) {
        alert('Por favor, complete todos los campos antes de trazar la ruta.');
        return;
    }
    
    isTracingRoute = true;
    document.getElementById('trace-ruta-btn').classList.add('active');
    map.getContainer().style.cursor = 'crosshair';
    
    // Limpiar ruta anterior si existe
    clearRoute();
    
    // Agregar evento de clic al mapa para trazar
    map.on('click', onRouteClick);
    
    console.log('Modo trazar ruta activado - Haz clic para agregar puntos');
}

// Función para manejar clics durante el trazado de ruta
function onRouteClick(e) {
    if (!isTracingRoute) return;
    
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;
    
    // Agregar punto a la ruta
    routePoints.push([lat, lng]);
    
    // Crear marcador numerado
    const marker = L.marker([lat, lng], {
        icon: L.divIcon({
            className: 'route-marker',
            html: routePoints.length.toString(),
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        })
    }).addTo(map);
    
    routeMarkers.push(marker);
    
    // Mostrar información del punto
    const pointInfo = `
        <b>Punto ${routePoints.length}</b><br>
        Lat: ${lat.toFixed(6)}<br>
        Lng: ${lng.toFixed(6)}
    `;
    
    marker.bindPopup(pointInfo).openPopup();
    
    // Crear o actualizar línea de ruta
    if (routePoints.length > 1) {
        // Remover línea anterior si existe
        if (currentRouteLine) {
            map.removeLayer(currentRouteLine);
        }
        
        // Crear nueva línea
        currentRouteLine = L.polyline(routePoints, {
            color: '#e67e22',
            weight: 4,
            opacity: 0.8
        }).addTo(map);
        
        // Mostrar información de la ruta
        const routeInfo = `
            <b>Ruta en construcción</b><br>
            Puntos: ${routePoints.length}<br>
            <small>Haz clic para agregar más puntos</small>
        `;
        
        currentRouteLine.bindPopup(routeInfo).openPopup();
    }
}

// Función para limpiar ruta
function clearRoute() {
    routeMarkers.forEach(marker => map.removeLayer(marker));
    routeMarkers = [];
    
    if (currentRouteLine) {
        map.removeLayer(currentRouteLine);
        currentRouteLine = null;
    }
    
    routePoints = [];
}

// Función para adicionar ruta
function adicionarRuta() {
    const descripcion = document.getElementById('descripcion-rutas').value;
    const tipo = document.getElementById('tipo-ruta').value;
    
    if (!descripcion || !tipo) {
        alert('Por favor, complete todos los campos antes de adicionar.');
        return;
    }
    
    if (routePoints.length < 2) {
        alert('Por favor, trace al menos 2 puntos para crear una ruta.');
        return;
    }
    
    // Crear objeto con los datos de la ruta
    const rutaData = {
        descripcion: descripcion,
        tipo: tipo,
        puntos: routePoints,
        fecha: new Date().toISOString()
    };
    
    console.log('Datos de la ruta a adicionar:', rutaData);
    alert('Ruta adicionada correctamente!');
    
    // Limpiar formulario y ruta
    clearRoute();
    clearAllFormFields();
    
    // Desactivar modo trazar
    isTracingRoute = false;
    document.getElementById('trace-ruta-btn').classList.remove('active');
    map.getContainer().style.cursor = '';
    map.off('click', onRouteClick);
}

// Eventos para los botones de ruta
document.getElementById('trace-ruta-btn').addEventListener('click', traceRuta);
document.getElementById('adicionar-ruta-btn').addEventListener('click', adicionarRuta);

// --- FUNCIONALIDAD DE LOS BOTONES DE ZONAS INUNDABLES ---
let isDrawingPolygon = false;
let polygonPoints = [];
let polygonMarkers = [];
let currentPolygon = null;

// Función para dibujar polígono en el mapa
function dibujePoligono() {
    const descripcion = document.getElementById('descripcion-zonas').value;
    
    if (!descripcion) {
        alert('Por favor, complete la descripción antes de dibujar el polígono.');
        return;
    }
    
    isDrawingPolygon = true;
    document.getElementById('dibuje-poligono-btn').classList.add('active');
    map.getContainer().style.cursor = 'crosshair';
    
    // Limpiar polígono anterior si existe
    clearPolygon();
    
    // Agregar evento de clic al mapa para dibujar
    map.on('click', onPolygonClick);
    
    console.log('Modo dibujar polígono activado - Haz clic para agregar puntos');
}

// Función para manejar clics durante el dibujo del polígono
function onPolygonClick(e) {
    if (!isDrawingPolygon) return;
    
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;
    
    // Agregar punto al polígono
    polygonPoints.push([lat, lng]);
    
    // Crear marcador numerado
    const marker = L.marker([lat, lng], {
        icon: L.divIcon({
            className: 'polygon-marker',
            html: polygonPoints.length.toString(),
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        })
    }).addTo(map);
    
    polygonMarkers.push(marker);
    
    // Mostrar información del punto
    const pointInfo = `
        <b>Punto ${polygonPoints.length}</b><br>
        Lat: ${lat.toFixed(6)}<br>
        Lng: ${lng.toFixed(6)}
    `;
    
    marker.bindPopup(pointInfo).openPopup();
    
    // Crear o actualizar polígono
    if (polygonPoints.length >= 3) {
        // Remover polígono anterior si existe
        if (currentPolygon) {
            map.removeLayer(currentPolygon);
        }
        
        // Crear nuevo polígono
        currentPolygon = L.polygon(polygonPoints, {
            color: '#16a085',
            weight: 2,
            fillColor: '#16a085',
            fillOpacity: 0.3
        }).addTo(map);
        
        // Mostrar información del polígono
        const polygonInfo = `
            <b>Zona Inundable en construcción</b><br>
            Puntos: ${polygonPoints.length}<br>
            <small>Haz clic para agregar más puntos</small>
        `;
        
        currentPolygon.bindPopup(polygonInfo).openPopup();
    }
}

// Función para limpiar polígono
function clearPolygon() {
    polygonMarkers.forEach(marker => map.removeLayer(marker));
    polygonMarkers = [];
    
    if (currentPolygon) {
        map.removeLayer(currentPolygon);
        currentPolygon = null;
    }
    
    polygonPoints = [];
}

// Función para adicionar zona inundable
function adicionarZona() {
    const descripcion = document.getElementById('descripcion-zonas').value;
    
    if (!descripcion) {
        alert('Por favor, complete la descripción antes de adicionar.');
        return;
    }
    
    if (polygonPoints.length < 3) {
        alert('Por favor, dibuje al menos 3 puntos para crear una zona inundable.');
        return;
    }
    
    // Crear objeto con los datos de la zona
    const zonaData = {
        descripcion: descripcion,
        puntos: polygonPoints,
        fecha: new Date().toISOString()
    };
    
    console.log('Datos de la zona inundable a adicionar:', zonaData);
    alert('Zona inundable adicionada correctamente!');
    
    // Limpiar formulario y polígono
    clearPolygon();
    clearAllFormFields();
    
    // Desactivar modo dibujar
    isDrawingPolygon = false;
    document.getElementById('dibuje-poligono-btn').classList.remove('active');
    map.getContainer().style.cursor = '';
    map.off('click', onPolygonClick);
}

// Eventos para los botones de zona inundable
document.getElementById('dibuje-poligono-btn').addEventListener('click', dibujePoligono);
document.getElementById('adicionar-zona-btn').addEventListener('click', adicionarZona);

// --- FUNCIONALIDAD DE LOS BOTONES DE ACTUALIZACIÓN ---

// Función para actualizar punto de referencia
function actualizarPunto() {
    const id = document.getElementById('id-update-puntos').value;
    const descripcion = document.getElementById('descripcion-update-puntos').value;
    const barrio = document.getElementById('barrio-update-puntos').value;
    const estado = document.getElementById('estado-update-puntos').value;
    
    if (!id || !descripcion || !barrio || !estado) {
        alert('Por favor, complete todos los campos antes de actualizar.');
        return;
    }
    
    // Aquí puedes agregar la lógica para actualizar el punto
    const puntoData = {
        id: id,
        descripcion: descripcion,
        barrio: barrio,
        estado: estado,
        fechaActualizacion: new Date().toISOString()
    };
    
    console.log('Datos del punto a actualizar:', puntoData);
    alert('Punto actualizado correctamente!');
    
    // Limpiar formulario después de actualizar
    clearAllUpdateFormFields();
}

// Función para actualizar ruta
function actualizarRuta() {
    const id = document.getElementById('id-update-rutas').value;
    const descripcion = document.getElementById('descripcion-update-rutas').value;
    const tipo = document.getElementById('tipo-update-ruta').value;
    
    if (!id || !descripcion || !tipo) {
        alert('Por favor, complete todos los campos antes de actualizar.');
        return;
    }
    
    // Aquí puedes agregar la lógica para actualizar la ruta
    const rutaData = {
        id: id,
        descripcion: descripcion,
        tipo: tipo,
        fechaActualizacion: new Date().toISOString()
    };
    
    console.log('Datos de la ruta a actualizar:', rutaData);
    alert('Ruta actualizada correctamente!');
    
    // Limpiar formulario después de actualizar
    clearAllUpdateFormFields();
}

// Función para actualizar zona inundable
function actualizarZona() {
    const idZona = document.getElementById('id_zona').value;
    const descripcion = document.getElementById('descripcion-update-zonas').value;
    
    if (!idZona || !descripcion) {
        alert('Por favor, complete todos los campos antes de actualizar.');
        return;
    }
    
    // Aquí puedes agregar la lógica para actualizar la zona
    const zonaData = {
        idZona: idZona,
        descripcion: descripcion,
        fechaActualizacion: new Date().toISOString()
    };
    
    console.log('Datos de la zona inundable a actualizar:', zonaData);
    alert('Zona inundable actualizada correctamente!');
    
    // Limpiar formulario después de actualizar
    clearAllUpdateFormFields();
}

// Eventos para los botones de actualización
document.getElementById('actualizar-punto-btn').addEventListener('click', actualizarPunto);
document.getElementById('actualizar-ruta-btn').addEventListener('click', actualizarRuta);
document.getElementById('actualizar-zona-btn').addEventListener('click', actualizarZona);

// Evento para el selector de tabla de la División 3
document.getElementById('tabla-selector-3').addEventListener('change', function() {
    const selectedValue = this.value;
    const formDeleteRutas = document.getElementById('form-delete-rutas');
    const formDeleteZonas = document.getElementById('form-delete-zonas');
    const formDeletePuntos = document.getElementById('form-delete-puntos');
    
    // Ocultar todos los formularios primero
    formDeleteRutas.style.display = 'none';
    formDeleteZonas.style.display = 'none';
    formDeletePuntos.style.display = 'none';
    
    // Limpiar todos los campos
    clearAllDeleteFormFields();
    
    // Mostrar el formulario correspondiente
    if (selectedValue === 'rutas') {
        formDeleteRutas.style.display = 'block';
    } else if (selectedValue === 'zonas_inundables') {
        formDeleteZonas.style.display = 'block';
    } else if (selectedValue === 'puntos_referencia') {
        formDeletePuntos.style.display = 'block';
    }
    
    console.log('División 3 - Tabla seleccionada para eliminar:', selectedValue);
});

// Función para limpiar todos los campos de formulario de eliminación
function clearAllDeleteFormFields() {
    // Limpiar campos de rutas
    document.getElementById('id-delete-rutas').value = '';
    
    // Limpiar campos de zonas_inundables
    document.getElementById('id_zona-delete').value = '';
    
    // Limpiar campos de puntos_referencia
    document.getElementById('id-delete-puntos').value = '';
}

// --- FUNCIONALIDAD DE LOS BOTONES DE ELIMINACIÓN ---

// Función para eliminar ruta
function eliminarRuta() {
    const id = document.getElementById('id-delete-rutas').value;
    
    if (!id) {
        alert('Por favor, ingrese el ID de la ruta a eliminar.');
        return;
    }
    
    // Confirmar eliminación
    if (!confirm(`¿Está seguro que desea eliminar la ruta con ID: ${id}?`)) {
        return;
    }
    
    // Aquí puedes agregar la lógica para eliminar la ruta
    const rutaData = {
        id: id,
        fechaEliminacion: new Date().toISOString()
    };
    
    console.log('Ruta a eliminar:', rutaData);
    alert('Ruta eliminada correctamente!');
    
    // Limpiar formulario después de eliminar
    clearAllDeleteFormFields();
}

// Función para eliminar zona inundable
function eliminarZona() {
    const idZona = document.getElementById('id_zona-delete').value;
    
    if (!idZona) {
        alert('Por favor, ingrese el ID de la zona a eliminar.');
        return;
    }
    
    // Confirmar eliminación
    if (!confirm(`¿Está seguro que desea eliminar la zona con ID: ${idZona}?`)) {
        return;
    }
    
    // Aquí puedes agregar la lógica para eliminar la zona
    const zonaData = {
        idZona: idZona,
        fechaEliminacion: new Date().toISOString()
    };
    
    console.log('Zona inundable a eliminar:', zonaData);
    alert('Zona inundable eliminada correctamente!');
    
    // Limpiar formulario después de eliminar
    clearAllDeleteFormFields();
}

// Función para eliminar punto de referencia
function eliminarPunto() {
    const id = document.getElementById('id-delete-puntos').value;
    
    if (!id) {
        alert('Por favor, ingrese el ID del punto a eliminar.');
        return;
    }
    
    // Confirmar eliminación
    if (!confirm(`¿Está seguro que desea eliminar el punto con ID: ${id}?`)) {
        return;
    }
    
    // Aquí puedes agregar la lógica para eliminar el punto
    const puntoData = {
        id: id,
        fechaEliminacion: new Date().toISOString()
    };
    
    console.log('Punto de referencia a eliminar:', puntoData);
    alert('Punto de referencia eliminado correctamente!');
    
    // Limpiar formulario después de eliminar
    clearAllDeleteFormFields();
}

// Eventos para los botones de eliminación
document.getElementById('eliminar-ruta-btn').addEventListener('click', eliminarRuta);
document.getElementById('eliminar-zona-btn').addEventListener('click', eliminarZona);
document.getElementById('eliminar-punto-btn').addEventListener('click', eliminarPunto);

// --- FUNCIONALIDAD DE MINIMIZAR/MAXIMIZAR DIVISIONES ---
function setupDivisionMinimize() {
    // Función para colapsar todas las divisiones
    function collapseAllDivisions() {
        for (let i = 1; i <= 4; i++) {
            const division = document.getElementById(`division-${i}`);
            const content = document.getElementById(`content-${i}`);
            const button = document.getElementById(`minimize-${i}`);
            
            if (division && content && button) {
                division.classList.add('collapsed');
                content.style.display = 'none';
                button.textContent = '+';
                button.classList.add('maximize');
                button.title = 'Maximizar';
            }
        }
    }
    
    // Función para expandir una división específica
    function expandDivision(divisionId) {
        const division = document.getElementById(divisionId);
        const content = document.getElementById(`content-${divisionId.split('-')[1]}`);
        const button = document.getElementById(`minimize-${divisionId.split('-')[1]}`);
        
        if (division && content && button) {
            division.classList.remove('collapsed');
            content.style.display = 'block';
            button.textContent = '−';
            button.classList.remove('maximize');
            button.title = 'Minimizar';
        }
    }
    
    // Función para alternar el estado de una división específica
    function toggleDivision(divisionId) {
        const division = document.getElementById(divisionId);
        const content = document.getElementById(`content-${divisionId.split('-')[1]}`);
        const button = document.getElementById(`minimize-${divisionId.split('-')[1]}`);
        
        if (division.classList.contains('collapsed')) {
            // Expandir esta división y colapsar las demás
            collapseAllDivisions();
            
            // Expandir la división seleccionada
            expandDivision(divisionId);
        } else {
            // Si ya está expandida, colapsarla
            division.classList.add('collapsed');
            content.style.display = 'none';
            button.textContent = '+';
            button.classList.add('maximize');
            button.title = 'Maximizar';
        }
    }
    
    // Agregar event listeners para los botones de minimizar
    for (let i = 1; i <= 4; i++) {
        const button = document.getElementById(`minimize-${i}`);
        const division = document.getElementById(`division-${i}`);
        
        if (button && division) {
            // Event listener para el botón
            button.addEventListener('click', function(e) {
                e.stopPropagation();
                toggleDivision(`division-${i}`);
            });
            
            // Event listener para el header completo (permite hacer clic en cualquier parte del header)
            const header = division.querySelector('.division-header');
            if (header) {
                header.addEventListener('click', function(e) {
                    if (e.target !== button) {
                        toggleDivision(`division-${i}`);
                    }
                });
            }
        }
    }
    
    // Inicializar con todas las divisiones colapsadas y solo la división 4 expandida
    function initializeDivisions() {
        // Colapsar todas las divisiones primero
        collapseAllDivisions();
        
        // Expandir solo la división 4 después de un pequeño delay
        setTimeout(() => {
            expandDivision('division-4');
        }, 50);
    }
    
    // Ejecutar inicialización cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeDivisions);
    } else {
        initializeDivisions();
    }
}

// Inicializar la funcionalidad de minimizar/maximizar
setupDivisionMinimize();

// Mostrar/ocultar el panel de capas
const layersPanelBtn = document.getElementById('layers-panel-btn');
const layersPanel = document.getElementById('layers-panel');
layersPanelBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    if (layersPanel.style.display === 'none' || layersPanel.style.display === '') {
        layersPanel.style.display = 'block';
    } else {
        layersPanel.style.display = 'none';
    }
});
// Ocultar el panel si se hace clic fuera de él
window.addEventListener('click', function(e) {
    if (layersPanel.style.display === 'block' && !layersPanel.contains(e.target) && e.target !== layersPanelBtn) {
        layersPanel.style.display = 'none';
    }
});
