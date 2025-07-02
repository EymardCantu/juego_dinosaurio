import pandas as pd
from elasticsearch import Elasticsearch

# Ruta del archivo CSV (ajústala según la ubicación correcta)
file_path = "/mnt/c/Documentos/Cómputo de alto desempeño/Github/Portafolio_computo/Parcial 3/elasticsearch_visualization/spotify_top_1000_tracks.csv"

# Conectar a Elasticsearch con autenticación
es = Elasticsearch(
    "http://localhost:9200",
    basic_auth=("elastic", "password") 
)

# Cargar el archivo CSV en un DataFrame
try:
    data = pd.read_csv(file_path)
    print(f'Dataset cargado correctamente:\n{data.head()}')  # Muestra las primeras filas

    # Crear un índice en Elasticsearch (si no existe)
    if not es.indices.exists(index="spotify_tracks"):
        es.indices.create(index="spotify_tracks", body={"settings": {"number_of_shards": 1}})
        print("Índice creado en Elasticsearch.")


    # Cargar cada fila del DataFrame en Elasticsearch
    for i, row in data.iterrows():
        doc = row.to_dict()  # Convierte la fila a un diccionario
        es.index(index="spotify_tracks", id=i, body={"doc": doc})



    print("Datos cargados en Elasticsearch exitosamente.")

except Exception as e:
    print(f'Error al cargar el dataset: {e}')
