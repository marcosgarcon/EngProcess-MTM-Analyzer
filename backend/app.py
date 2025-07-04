from flask import Flask, jsonify, request
from flask_cors import CORS
import csv
import json

# Inicializa o app Flask
app = Flask(__name__)
# Habilita o CORS para permitir comunicação entre o frontend e o backend
CORS(app)

# Carrega os dados do MTM para a memória
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

@app.route('/api/calculate_standard_time', methods=['POST'])
def calculate_standard_time():
    """
    Calcula o tempo padrão com base nos dados recebidos.
    """
    data = request.json
    try:
        delta = float(data['delta'])
        ritmo = float(data['ritmo'])
        suplemento = float(data['suplemento'])

        if delta < 0 or ritmo <= 0 or suplemento < 0:
            return jsonify({"error": "Valores inválidos"}), 400

        tempo_normal = delta * (ritmo / 100.0)
        tempo_padrao = tempo_normal * (1 + (suplemento / 100.0))

        return jsonify({"tempo_padrao": round(tempo_padrao, 4)})

    except (ValueError, KeyError):
        return jsonify({"error": "Dados inválidos ou faltando"}), 400

@app.route('/api/generate_report', methods=['POST'])
def generate_report():
    """
    Recebe os dados da tabela e gera um laudo com sugestões (IA baseada em regras).
    """
    analysis_data = request.json
    
    report_lines = []
    report_lines.append("="*40)
    report_lines.append("  RELATÓRIO DE ANÁLISE DE PROCESSO")
    report_lines.append("="*40)
    
    total_time = 0
    max_time_element = {"delta": 0, "description": "N/A"}
    
    for element in analysis_data:
        try:
            delta = float(element.get('delta', 0))
            total_time += delta
            if delta > max_time_element["delta"]:
                max_time_element["delta"] = delta
                max_time_element["description"] = element.get('description', 'Descrição não preenchida')
        except (ValueError, TypeError):
            continue

    report_lines.append(f"\nAnálise Geral:")
    report_lines.append(f"- Número de Elementos: {len(analysis_data)}")
    report_lines.append(f"- Tempo Total Cronometrado: {total_time:.2f} segundos")
    
    report_lines.append("\nPontos de Atenção (Sugestões de Melhoria):")
    
    # Regra 1: Identificar o gargalo
    if max_time_element["delta"] > 0:
        report_lines.append(
            f"- GARGALO IDENTIFICADO: O movimento '{max_time_element['description']}' "
            f"é o mais demorado, com {max_time_element['delta']:.2f} segundos. "
            f"Ação sugerida: Analisar este movimento em detalhe. É possível simplificá-lo, "
            f"usar uma ferramenta melhor ou aproximar os componentes?"
        )

    # Regra 2: Verificar descrições vazias
    empty_descriptions = sum(1 for el in analysis_data if not el.get('description', '').strip())
    if empty_descriptions > 0:
        report_lines.append(
            f"- DOCUMENTAÇÃO INCOMPLETA: Foram encontrados {empty_descriptions} movimentos sem descrição. "
            f"Ação sugerida: Preencher todas as descrições para garantir a clareza do processo."
        )
    
    # Regra 3: Movimentos muito curtos
    short_movements = sum(1 for el in analysis_data if float(el.get('delta', 0)) < 0.5 and float(el.get('delta', 0)) > 0)
    if short_movements > 3:
        report_lines.append(
            f"- ALTA FRAGMENTAÇÃO: Existem {short_movements} movimentos muito curtos (< 0.5s). "
            f"Ação sugerida: Avaliar se é possível combinar múltiplos movimentos pequenos em um único e mais fluido."
        )

    report_lines.append("\n" + "="*40)
    report_lines.append("  Laudo gerado por EngProcess MTM Analyzer")
    report_lines.append("="*40)

    return jsonify({"report": "\n".join(report_lines)})


if __name__ == '__main__':
    app.run(debug=True, port=5000)
