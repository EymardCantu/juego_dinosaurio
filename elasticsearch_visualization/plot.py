import os
import matplotlib.pyplot as plt
from elasticsearch import Elasticsearch

# Conectar a Elasticsearch
es = Elasticsearch(
    "http://localhost:9200",
    basic_auth=("elastic", "password"),
    headers={"Accept": "application/vnd.elasticsearch+json; compatible-with=7"}
)

# Realizar una consulta para obtener los datos
result = es.search(index="spotify_tracks", query={"match_all": {}}, size=1000)

# Extraer los valores de la columna que deseas graficar
streams = [hit["_source"]["doc"]["popularity"] for hit in result["hits"]["hits"]]

# Asegurar que el directorio 'docs' exista
if not os.path.exists("docs"):
    os.makedirs("docs")

# Graficar los datos
plt.figure(figsize=(10, 6))
plt.hist(streams, bins=50, color="skyblue", edgecolor="black")
plt.title("Distribución de Streams de Canciones en Spotify")
plt.xlabel("Streams")
plt.ylabel("Frecuencia")
plt.savefig("docs/graph.png")
#plt.show()
