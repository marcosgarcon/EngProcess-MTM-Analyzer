// VERSÃO COM MARCAÇÃO AUTOMÁTICA

document.addEventListener('DOMContentLoaded', () => {
    // --- REFERÊNCIAS ---
    const videoUpload = document.getElementById('videoUpload');
    const videoPlayer = document.getElementById('videoPlayer');
    const canvasElement = document.getElementById('outputCanvas');
    const canvasCtx = canvasElement.getContext('2d');
    const markStartBtn = document.getElementById('markStartBtn');
    const markEndBtn = document.getElementById('markEndBtn');
    const analysisTableBody = document.querySelector("#analysisTable tbody");
    const ritmoInput = document.getElementById('ritmo');
    const suplementoInput = document.getElementById('suplemento');
    const saveConfigBtn = document.getElementById('saveConfigBtn');
    const loadConfigInput = document.getElementById('loadConfigInput');
    const totalStandardTimeEl = document.getElementById('total-standard-time');
    const totalElementsEl = document.getElementById('total-elements');
    const averageTimeEl = document.getElementById('average-time');
    const generateReportBtn = document.getElementById('generateReportBtn');
    const reportModal = document.getElementById('reportModal');
    const reportText = document.getElementById('report-text');
    const closeButton = document.querySelector('.close-button');
    
    // Novas referências e variáveis para o Modo Automático
    const autoMarkCheckbox = document.getElementById('autoMarkCheckbox');
    let autoMarkEnabled = false;
    let lastHandPosition = null;
    let isHandMoving = false;
    const MOVEMENT_THRESHOLD = 0.008; // Limiar de velocidade (sensibilidade)
    let movementCooldown = 0; // Para evitar marcações múltiplas e rápidas

    const API_URL = 'http://localhost:5000';
    let startTime = null;
    let elementCounter = 0;

    // --- MEDIAPIPE ---
    function onResults(results) {
        // Desenho no canvas (igual a antes)
        canvasElement.width = videoPlayer.videoWidth;
        canvasElement.height = videoPlayer.videoHeight;
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        canvasCtx.drawImage(videoPlayer, 0, 0, canvasElement.width, canvasElement.height);

        // Se a IA detetou mãos...
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const handLandmarks = results.multiHandLandmarks[0]; // Focamos na primeira mão detetada

            // Desenha o esqueleto da mão (igual a antes)
            drawConnectors(canvasCtx, handLandmarks, HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 5 });
            drawLandmarks(canvasCtx, handLandmarks, { color: '#FF0000', lineWidth: 2 });
            
            // --- LÓGICA DE MARCAÇÃO AUTOMÁTICA ---
            if (autoMarkEnabled && movementCooldown <= 0) {
                const wrist = handLandmarks[0]; // Usamos o pulso (landmark 0) como referência
                
                if (lastHandPosition) {
                    // Calcula a distância que o pulso se moveu desde o último frame
                    const dx = wrist.x - lastHandPosition.x;
                    const dy = wrist.y - lastHandPosition.y;
                    const dz = wrist.z - lastHandPosition.z;
                    const velocity = Math.sqrt(dx*dx + dy*dy + dz*dz);

                    const wasHandMoving = isHandMoving;
                    isHandMoving = velocity > MOVEMENT_THRESHOLD;

                    // Detetou uma MUDANÇA de PARADO para MOVIMENTO?
                    if (isHandMoving && !wasHandMoving) {
                        markStartBtn.click(); // Simula o clique no botão de início
                        movementCooldown = 30; // Define um tempo de espera (30 frames)
                    }
                    // Detetou uma MUDANÇA de MOVIMENTO para PARADO?
                    else if (!isHandMoving && wasHandMoving) {
                        markEndBtn.click(); // Simula o clique no botão de fim
                        movementCooldown = 30; // Define um tempo de espera
                    }
                }
                lastHandPosition = wrist; // Atualiza a última posição da mão
            }
        }
        if (movementCooldown > 0) {
            movementCooldown--; // Decrementa o tempo de espera
        }
    }

    const hands = new Hands({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
    hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.7, minTrackingConfidence: 0.7 });
    hands.onResults(onResults);

    async function processVideoFrame() {
        if (videoPlayer.paused || videoPlayer.ended) { return; }
        await hands.send({ image: videoPlayer });
        requestAnimationFrame(processVideoFrame);
    }

    // --- EVENTOS ---
    videoUpload.addEventListener('change', (e) => { const file = e.target.files[0]; if (file) { videoPlayer.src = URL.createObjectURL(file); videoPlayer.style.display = 'block'; } });
    videoPlayer.addEventListener('play', () => { processVideoFrame(); });
    
    // Evento para a nossa nova checkbox
    autoMarkCheckbox.addEventListener('change', (e) => {
        autoMarkEnabled = e.target.checked;
        if(autoMarkEnabled) {
            console.log("Modo de marcação automática ATIVADO.");
            isHandMoving = false; // Reinicia o estado
            lastHandPosition = null;
        } else {
            console.log("Modo de marcação automática DESATIVADO.");
        }
    });

    // O resto dos seus eventos e funções continuam aqui, sem alterações
    markStartBtn.addEventListener('click', () => { startTime = videoPlayer.currentTime; markStartBtn.style.backgroundColor = '#28a745'; markEndBtn.style.backgroundColor = ''; });
    markEndBtn.addEventListener('click', () => handleMarkEnd());
    analysisTableBody.addEventListener('input', (e) => { if (e.target.classList.contains('mtm-code-cell')) { const cell = e.target; const mtmCode = cell.innerText.trim().toUpperCase(); const tmuCell = cell.parentElement.querySelector('.tmu-cell'); if (mtmCode.length >= 2) fetchTMU(mtmCode, tmuCell); else tmuCell.textContent = ''; } });
    document.addEventListener('keydown', (e) => { if (e.key.toLowerCase() === 'i') markStartBtn.click(); if (e.key.toLowerCase() === 'f') markEndBtn.click(); });
    saveConfigBtn.addEventListener('click', handleSaveConfig);
    loadConfigInput.addEventListener('change', handleLoadConfig);
    generateReportBtn.addEventListener('click', handleGenerateReport);
    closeButton.addEventListener('click', () => { reportModal.style.display = 'none'; });
    window.addEventListener('click', (event) => { if (event.target == reportModal) { reportModal.style.display = 'none'; } });

    // Funções existentes (sem alteração)
    const updateSummary = () => { const allRows = analysisTableBody.querySelectorAll('tr'); const standardTimeCells = document.querySelectorAll('.standard-time-cell'); let totalStandardTime = 0; standardTimeCells.forEach(cell => { const timeValue = parseFloat(cell.textContent); if (!isNaN(timeValue)) { totalStandardTime += timeValue; } }); const totalElements = allRows.length; const averageTime = totalElements > 0 ? totalStandardTime / totalElements : 0; totalStandardTimeEl.textContent = `${totalStandardTime.toFixed(2)} s`; totalElementsEl.textContent = totalElements; averageTimeEl.textContent = `${averageTime.toFixed(2)} s`; };
    const handleMarkEnd = async () => { if (startTime === null) { console.warn("Marcação de Fim ignorada: Início não foi marcado."); return; } const endTime = videoPlayer.currentTime; if (endTime <= startTime) { console.warn("Marcação de Fim ignorada: Tempo final <= tempo inicial."); return; } elementCounter++; const delta = endTime - startTime; const ritmo = parseFloat(ritmoInput.value); const suplemento = parseFloat(suplementoInput.value); const standardTime = await calculateStandardTime(delta, ritmo, suplemento); const newRow = analysisTableBody.insertRow(); newRow.innerHTML = `<td>${elementCounter}</td><td>${startTime.toFixed(3)}</td><td>${endTime.toFixed(3)}</td><td>${delta.toFixed(3)}</td><td contenteditable="true" class="description-cell"></td><td contenteditable="true" class="mtm-code-cell"></td><td class="tmu-cell"></td><td class="standard-time-cell">${standardTime.toFixed(4)}</td>`; startTime = null; markStartBtn.style.backgroundColor = ''; updateSummary(); };
    const handleGenerateReport = async () => { const tableData = []; const rows = analysisTableBody.querySelectorAll('tr'); if (rows.length === 0) { alert("A tabela de análise está vazia. Adicione movimentos para gerar um laudo."); return; } rows.forEach(row => { const cells = row.querySelectorAll('td'); tableData.push({ id: cells[0].textContent, delta: cells[3].textContent, description: cells[4].textContent, mtmCode: cells[5].textContent }); }); generateReportBtn.textContent = 'Analisando...'; generateReportBtn.disabled = true; try { const response = await fetch(`${API_URL}/api/generate_report`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tableData) }); if (!response.ok) throw new Error('Falha ao gerar o laudo a partir da API.'); const data = await response.json(); reportText.textContent = data.report; reportModal.style.display = 'block'; } catch (error) { alert(error.message); console.error("Erro ao gerar laudo:", error); } finally { generateReportBtn.textContent = 'Gerar Laudo IA'; generateReportBtn.disabled = false; } };
    async function calculateStandardTime(delta, ritmo, suplemento) { try { const response = await fetch(`${API_URL}/api/calculate_standard_time`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ delta, ritmo, suplemento }) }); if (!response.ok) return 0; const data = await response.json(); return data.tempo_padrao; } catch (error) { console.error("Erro ao calcular tempo padrão:", error); return 0; } }
    async function fetchTMU(code, targetCell) { try { const response = await fetch(`${API_URL}/api/get_tmu/${code}`); if (!response.ok) { targetCell.textContent = 'N/A'; return; } const data = await response.json(); targetCell.textContent = data.tmu; } catch (error) { console.error("Erro ao conectar com o backend:", error); targetCell.textContent = 'Erro'; } }
    const handleSaveConfig = () => { const config = { ritmo: ritmoInput.value, suplemento: suplementoInput.value }; const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'config_mtm.json'; a.click(); URL.revokeObjectURL(url); };
    const handleLoadConfig = (event) => { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = function (e) { try { const config = JSON.parse(e.target.result); if (config.ritmo) ritmoInput.value = config.ritmo; if (config.suplemento) suplementoInput.value = config.suplemento; } catch (error) { alert("Erro ao ler o arquivo de configuração."); } }; reader.readAsText(file); };
});
