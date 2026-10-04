# GMAO Web 1 · MEC048H

Aplicación estática de análisis de mantenimiento basada en la estructura de `GMAO/GMAO_local.ipynb` y en el enfoque ejecutivo de `GMAO/GMAO.ipynb`. No modifica los notebooks ni los datasets originales.

## Uso

Abre `index.html` en un navegador moderno (Edge, Chrome o Firefox). No requiere Python, MiKTeX, Node, servidor de aplicación ni API. Todos los scripts están incluidos en `vendor/`; funciona también sin conexión después de descargar la carpeta completa.

1. Selecciona o arrastra un CSV, XLSX o XLS de hasta 50 MB.
2. En Excel, elige la hoja que contiene la tabla. La primera fila debe ser el encabezado.
3. Revisa «Columnas y calidad de los datos». Si cambian los nombres, asigna las columnas manualmente y pulsa «Aplicar columnas».
4. Confirma el formato numérico y la moneda. Los campos `Costo_total_CLP` se reconocen como CLP; en exportaciones SAP sin moneda se muestra «No indicada» hasta que la confirmes.
5. Explora los filtros, agrupaciones de Pareto y matrices. Las leyendas permiten ocultar series; los puntos muestran información al pasar el cursor.
6. Exporta el informe PDF, el Excel de resultados o los gráficos PNG.

«Ver demostración» crea **datos sintéticos claramente identificados**. No incluye datos de producción. «Descargar plantilla CSV» entrega los 40 encabezados de la estructura original.

Los archivos cargados permanecen en memoria del navegador. No se suben a ningún servidor ni se guardan en almacenamiento permanente. Recargar la página elimina el análisis actual.

## Publicar en GitHub Pages

### Opción sencilla: aplicación en la raíz del repositorio

1. Copia **el contenido completo de `webapp1/`**, incluida `vendor/`, a la raíz del repositorio destinado a la aplicación.
2. Sube los archivos a la rama `main`.
3. En GitHub, abre **Settings → Pages → Build and deployment**.
4. Elige **Deploy from a branch**, rama `main`, carpeta `/ (root)` y guarda.
5. Abre la URL que GitHub muestra después de publicar.

Todos los enlaces son relativos, por lo que funcionan bajo `https://usuario.github.io/repositorio/`. `.nojekyll` evita el procesamiento Jekyll. No hay compilación ni instalación de dependencias.

### Conservar la carpeta webapp1 en un repositorio existente

Sube `webapp1/` completa y publica la raíz de la rama. La aplicación estará en `https://usuario.github.io/repositorio/webapp1/`. También puedes copiar únicamente su contenido a `docs/` y seleccionar `/docs` en Pages.

Publica solo los archivos de la aplicación; los datasets se cargan desde la interfaz. La carpeta `.webapp-tools/`, situada fuera de `webapp1`, contiene herramientas y evidencias de validación y no forma parte del sitio.

## Funcionalidad

- CSV UTF-8 o Windows-1252, separador detectado automáticamente; Excel con varias hojas y fechas seriales de Excel.
- Limpieza de espacios y apóstrofos iniciales, exclusión de filas exactamente duplicadas, diagnóstico de vacíos, fechas inválidas, recursos negativos y OT repetidas.
- OT únicas, equipos, costos, horas de trabajo, downtime registrado, MTTR y mediana cuando existen los campos requeridos.
- Evolución mensual, distribución de órdenes/recursos por tipo y estados.
- Pareto de frecuencia, costo y downtime por equipo, ubicación, puesto, clase, modo de falla, área o tipo, según las columnas presentes.
- Atraso de inicio, clasificación adelantada/a tiempo/atrasada y duración transcurrida.
- Matriz frecuencia/costo y ranking Top 20; Jack-Knife de activos y de modos de falla con muestras válidas.
- PDF con portada, resumen, alcance, KPI, Pareto, planificación, prioridades, hallazgos, hipótesis, metodología, columnas e imágenes de todos los gráficos visibles.
- Excel con KPI, distribución, estados, evolución, Pareto, ranking, Jack-Knife, atrasos, datos tratados y trazabilidad.

## Reglas de cálculo y diferencias metodológicas

- **Órdenes:** OT distintas no vacías. **Registros:** filas limpias. Se advierte si una OT se repite. Costos y recursos se suman por registro; revisa que no se repita un costo total en varias partidas.
- **Costo promedio:** media por registro con costo válido. No se imputan ceros a vacíos. Los costos negativos se conservan como posibles ajustes; si un grupo de Pareto es negativo, sus porcentajes no se muestran.
- **MTTR:** media del campo explícito `Tiempo_reparacion_h`, positivo, para `Correctivo` y `CERRADA`. A diferencia del cálculo inicio-fin del notebook local, no se confunde duración transcurrida con tiempo efectivo de reparación. La duración inicio-fin se presenta separadamente y excluye valores negativos.
- **Downtime:** únicamente el campo explícito `Downtime_h`; su suma no representa disponibilidad ni indisponibilidad global sin validar solapamientos.
- **Modos de falla:** el Pareto se limita a correctivas cerradas con modo registrado cuando existen tipo y estado. No se infieren modos a partir de descripciones o clases de orden.
- **Fechas y filtros:** fecha de creación, o inicio real, o inicio planificado, en ese orden. Formatos día/mes/año e ISO, interpretados en UTC. Atraso = inicio real menos planificado en días de 24 horas; no se aplica tolerancia.
- **Pareto:** orden descendente; acumulado calculado sobre todas las categorías. Una OT con varios grupos puede contarse en más de uno. El Top seleccionado no redefine el denominador.
- **Prioridad económica:** medias de frecuencia/costo como límites de cuadrantes. Puntaje `50 × (OT / máximo_OT + costo_no_negativo / máximo_costo)`. Los grupos sin costo válido no se puntúan. No es una valoración de riesgo técnico.
- **Jack-Knife:** correctivas cerradas con reparación explícita positiva; frecuencia y MTTR normalizados por sus medias de grupo. Umbrales 1, producto N* × MTTR* para ordenar. No se confunde este índice con el puntaje económico.
- **Campos ausentes:** no disponibles; no se calculan MTTR, downtime ni modos de falla por inferencia. Las clases SAP no se convierten automáticamente en tipos de mantenimiento.
- **Conclusiones:** hechos calculados separados de hipótesis y recomendaciones pendientes de validación. Sin llamadas a IA ni texto que invente causas.

## Archivos

- `index.html`: interfaz y navegación.
- `styles.css`: diseño adaptable a escritorio y móvil.
- `analysis.js`: limpieza y cálculos puros.
- `app.js`: lectura de archivos, filtros, gráficos y exportaciones.
- `vendor/`: bibliotecas completas, con versiones fijadas.
- `THIRD_PARTY.md`: versiones, fuentes y licencias.
- `.nojekyll`: compatibilidad de publicación estática.

Los PNG usan el doble de resolución del área visible del gráfico. El PDF conserva texto seleccionable y usa imágenes de los gráficos. Para datasets muy grandes, el procesamiento puede tardar: el límite de 50 MB no garantiza un tiempo de respuesta específico.
