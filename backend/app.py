from flask import Flask, jsonify, request
from flask_cors import CORS
import csv
import json

app = Flask(__name__)

# --- LINHA CORRIGIDA ---
# Agora permitimos pedidos de ambas as portas, 8000 e 8001.
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:8000", "http://localhost:8001"]}})

# O resto do ficheiro continua igual...
@app.route('/')
def index():
    return "Servidor do EngProcess MTM Analyzer está funcionando!"

@app.route('/api/get_tmu/<string:codigo_movimento>')
def get_tmu(codigo_movimento):
    tmu_valor = mtm_database.get(codigo_movimento.upper())
    if tmu_valor is not None:
        return jsonify({"codigo": codigo_movimento, "tmu": tmu_valor})
    else:
        return jsonify({"error": "Código de movimento não encontrado"}), 404

# ... (cole o resto das suas rotas aqui, elas não mudam)
@app.route('/api/calculate_standard_time', methods=['POST'])
def calculate_standard_time():
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
    if max_time_element["delta"] > 0:
        report_lines.append(
            f"- GARGALO IDENTIFICADO: O movimento '{max_time_element['description']}' "
            f"é o mais demorado, com {max_time_element['delta']:.2f} segundos. "
            f"Ação sugerida: Analisar este movimento em detalhe."
        )
    empty_descriptions = sum(1 for el in analysis_data if not el.get('description', '').strip())
    if empty_descriptions > 0:
        report_lines.append(
            f"- DOCUMENTAÇÃO INCOMPLETA: Foram encontrados {empty_descriptions} movimentos sem descrição. "
            f"Ação sugerida: Preencher todas as descrições."
        )
    short_movements = sum(1 for el in analysis_data if float(el.get('delta', 0)) < 0.5 and float(el.get('delta', 0)) > 0)
    if short_movements > 3:
        report_lines.append(
            f"- ALTA FRAGMENTAÇÃO: Existem {short_movements} movimentos muito curtos (< 0.5s). "
            f"Ação sugerida: Avaliar se é possível combinar movimentos."
        )
    report_lines.append("\n" + "="*40)
    report_lines.append("  Laudo gerado por EngProcess MTM Analyzer")
    report_lines.append("="*40)
    return jsonify({"report": "\n".join(report_lines)})


if __name__ == '__main__':
    app.run(debug=True, port=5000)
