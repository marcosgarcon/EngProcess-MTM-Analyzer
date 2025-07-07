from flask import Flask, jsonify, request
from flask_cors import CORS
import csv
import json

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:8000", "http://localhost:8001"]}})

# Lógica de carregamento do MTM atualizada
mtm_database = {}
try:
    with open('mtm_data.csv', mode='r', encoding='utf-8') as infile:
        reader = csv.DictReader(infile)
        for row in reader:
            mtm_database[row['codigo_movimento']] = {
                "tmu": float(row['tmu']),
                "tipo": row['tipo'],
                "descricao": row['descricao']
            }
except FileNotFoundError:
    print("Aviso: 'mtm_data.csv' não encontrado.")

@app.route('/')
def index():
    return "Servidor do EngProcess MTM Analyzer está funcionando!"

@app.route('/api/get_tmu/<string:codigo_movimento>')
def get_tmu(codigo_movimento):
    data = mtm_database.get(codigo_movimento.upper())
    if data:
        return jsonify({"codigo": codigo_movimento, "tmu": data['tmu']})
    else:
        return jsonify({"error": "Código de movimento não encontrado"}), 404

@app.route('/api/generate_report', methods=['POST'])
def generate_report():
    analysis_data = request.json
    report_lines = ["="*50, "  RELATÓRIO DE ANÁLISE DE PROCESSO (v2.0 IA)", "="*50]
    
    total_time = 0
    gargalo = {"delta": 0, "description": "N/A"}
    movimentos_complexos = []
    tempo_segurando = 0
    trocas_de_ferramenta = 0

    for element in analysis_data:
        try:
            delta = float(element.get('delta', 0))
            total_time += delta
            
            if delta > gargalo["delta"]:
                gargalo["delta"] = delta
                gargalo["description"] = element.get('description', 'Não preenchida')
            
            codigo_mtm = element.get('mtmCode', '').upper()
            if codigo_mtm in mtm_database:
                tipo_movimento = mtm_database[codigo_mtm]['tipo']
                if 'E' in codigo_mtm or 'P2S' in codigo_mtm:
                    movimentos_complexos.append(f"- '{element.get('description')}' ({codigo_mtm})")
                if tipo_movimento == 'SEGURAR':
                    tempo_segurando += delta
                if tipo_movimento in ['PEGAR', 'LARGAR']:
                    trocas_de_ferramenta += 1
        except (ValueError, TypeError):
            continue

    report_lines.append(f"\n>> ANÁLISE GERAL:")
    report_lines.append(f"- Tempo Total Cronometrado: {total_time:.2f} segundos")
    report_lines.append(f"- Número de Elementos: {len(analysis_data)}")
    
    report_lines.append("\n>> SUGESTÕES DE MELHORIA (Laudo IA):")
    
    if gargalo["delta"] > 0:
        report_lines.append(f"1. GARGALO: O movimento '{gargalo['description']}' é o mais longo ({gargalo['delta']:.2f}s).\n   -> Ação: Focar a análise neste ponto. É possível simplificar ou melhorar a ferramenta usada?")
    if movimentos_complexos:
        report_lines.append(f"2. RISCO ERGONÔMICO: Foram detetados {len(movimentos_complexos)} movimentos complexos ou com esforço:")
        report_lines.extend(movimentos_complexos)
        report_lines.append("   -> Ação: Avaliar a ergonomia destes postos para reduzir o esforço.")
    if tempo_segurando > 0:
        percentual_segurando = (tempo_segurando / total_time) * 100 if total_time > 0 else 0
        report_lines.append(f"3. MÃO OCIOSA: O operador passa {tempo_segurando:.2f}s ({percentual_segurando:.1f}% do tempo) apenas a segurar peças.\n   -> Ação: Criar um gabarito ou dispositivo de fixação para libertar a mão.")
    if trocas_de_ferramenta > 4:
        report_lines.append(f"4. LAYOUT DO POSTO: Foram detetadas {trocas_de_ferramenta} trocas de ferramentas (pegar/largar).\n   -> Ação: Otimizar o layout ou usar uma ferramenta multifuncional.")
    if len(report_lines) == 7:
        report_lines.append("   - Nenhum ponto crítico de melhoria foi detetado pelas regras atuais da IA.")

    report_lines.append("\n" + "="*50)
    return jsonify({"report": "\n".join(report_lines)})

@app.route('/api/calculate_standard_time', methods=['POST'])
def calculate_standard_time():
    data = request.json
    try:
        delta = float(data['delta'])
        ritmo = float(data['ritmo'])
        suplemento = float(data['suplemento'])
        if delta < 0 or ritmo <= 0 or suplemento < 0: return jsonify({"error": "Valores inválidos"}), 400
        tempo_normal = delta * (ritmo / 100.0)
        tempo_padrao = tempo_normal * (1 + (suplemento / 100.0))
        return jsonify({"tempo_padrao": round(tempo_padrao, 4)})
    except (ValueError, KeyError):
        return jsonify({"error": "Dados inválidos ou faltando"}), 400

if __name__ == '__main__':
    app.run(debug=True, port=5000)
