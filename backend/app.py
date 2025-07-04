from flask import Flask, jsonify, request
from flask_cors import CORS
import csv

# Inicializa o app Flask
app = Flask(__name__)
# Habilita o CORS para permitir comunicação entre o frontend e o backend
CORS(app)

# Carrega os dados do MTM para a memória (simples para começar)
mtm_database = {}
try:
    with open('mtm_data.csv', mode='r', encoding='utf-8') as infile:
        reader = csv.reader(infile)
        next(reader) # Pula o cabeçalho
        for rows in reader:
            mtm_database[rows[0]] = float(rows[1])
except FileNotFoundError:
    print("Aviso: 'mtm_data.csv' não encontrado. O banco de dados MTM estará vazio.")

@app.route('/')
def index():
    """ Rota inicial para verificar se o servidor está no ar. """
    return "Servidor do EngProcess MTM Analyzer está funcionando!"

@app.route('/api/get_tmu/<string:codigo_movimento>')
def get_tmu(codigo_movimento):
    """ Rota da API para buscar o valor TMU de um código de movimento. """
    tmu_valor = mtm_database.get(codigo_movimento.upper())
    if tmu_valor is not None:
        return jsonify({"codigo": codigo_movimento, "tmu": tmu_valor})
    else:
        return jsonify({"error": "Código de movimento não encontrado"}), 404

# --- Rotas a serem implementadas no futuro ---
# @app.route('/api/save_analysis', methods=['POST'])
# def save_analysis():
#     data = request.json
#     print("Análise recebida:", data)
#     # Lógica para salvar os dados no banco de dados virá aqui
#     return jsonify({"status": "sucesso"}), 201

if __name__ == '__main__':
    # Roda o servidor em modo de desenvolvimento
    app.run(debug=True, port=5000)