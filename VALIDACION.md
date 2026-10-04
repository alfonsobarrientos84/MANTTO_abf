# Validación

Verificación realizada el 3 de octubre de 2026 con Chromium portátil y Playwright.

- Sintaxis válida de los scripts de la aplicación.
- Carga del CSV original de GMAO: 5.090 órdenes; conteo, costo y MTTR coinciden con el motor de análisis.
- Carga de EXPORT.XLSX: 18.940 órdenes; reconocimiento de columnas SAP y fechas de Excel; MTTR y downtime permanecen no disponibles.
- Demostración de 96 registros: filtros por tipo y restablecimiento verificados.
- CSV con separador punto y coma, columnas faltantes y encabezados duplicados.
- Texto de archivos presentado como texto, sin ejecutar etiquetas HTML.
- Vista de escritorio 1440 × 1000 y móvil 390 × 844; sin desbordamiento horizontal de la página.
- Descarga efectiva de PDF y Excel desde el navegador. Los KPI exportados a Excel coinciden con el tablero.
- PDF con todas las imágenes visibles y texto/tablas: aproximadamente 755 KB para el dataset de GMAO probado, con compresión habilitada.
- Sin excepciones JavaScript en la prueba de navegador.

Las capturas, los scripts de prueba y los archivos de muestra se guardan en `.webapp-tools/validation/`, fuera de la aplicación que se publica. El PDF se genera en el navegador y su tamaño cambia según los filtros y la cantidad de gráficos.
