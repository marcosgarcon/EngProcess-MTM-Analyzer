// CÓDIGO COMPLETO PARA script.js (DEPURAÇÃO AVANÇADA)

document.addEventListener('DOMContentLoaded', () => {
    console.log("1. DOM carregado.");

    // --- REFERÊNCIAS ---
    const videoUpload = document.getElementById('videoUpload');
    console.log("VERIFICAÇÃO: Elemento de upload encontrado?", videoUpload);
    const videoPlayer = document.getElementById('videoPlayer');
    const canvasElement = document.getElementById('outputCanvas');
    const canvasCtx = canvasElement.getContext('2d');
    // ... resto das referências
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


    const API_URL = 'http://localhost:5000';
    let startTime = null;
    let elementCounter = 0;

    // --- MEDIAPIPE ---
    console.log("2. A preparar o MediaPipe...");

    function onResults(results) {
        // Este log só aparecerá se a IA processar um frame com sucesso
        console.log("B. IA processou um frame.");
        canvasElement.width = videoPlayer.videoWidth;
        canvasElement.height = videoPlayer.videoHeight;
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        canvasCtx.drawImage(videoPlayer, 0, 0, canvasElement.width, canvasElement.height);
        if (results.multiHandLandmarks) {
            for (const landmarks of results.multiHandLandmarks) {
                drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 5 });
                drawLandmarks(canvasCtx, landmarks, { color: '#FF0000', lineWidth: 2 });
            }
        }
    }

    try {
        const hands = new Hands({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });
        hands.setOptions({ maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
        hands.onResults(onResults);
        console.log("3. MediaPipe inicializado com sucesso.");

        async function processVideoFrame() {
            // Este log aparecerá a cada frame do loop de animação
            console.log("A. A processar um frame do vídeo...");
            if (videoPlayer.paused || videoPlayer.ended) return;
            try {
                await hands.send({ image: videoPlayer });
            } catch(e) {
                console.error("ERRO DENTRO DO LOOP DE PROCESSAMENTO:", e);
            }
            requestAnimationFrame(processVideoFrame);
        }

        videoPlayer.addEventListener('play', () => {
            console.log("5. Evento 'play' do vídeo foi DISPARADO. A iniciar o loop de animação.");
            processVideoFrame();
        });

    } catch (e) {
        console.error("ERRO CRÍTICO AO INICIAR O MEDIAPIPE:", e);
    }

    // --- EVENTOS ---
    videoUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            console.log("4. Ficheiro de vídeo foi CARREGADO.");
            videoPlayer.src = URL.createObjectURL(file);
            videoPlayer.style.display = 'block';
        }
    });

    // ... (resto do seu código, sem alterações)
    markStartBtn.addEventListener('click', () => { startTime = videoPlayer.currentTime; markStartBtn.style.backgroundColor = '#28a745'; markEndBtn.style.backgroundColor = ''; });
    markEndBtn.addEventListener('click', () => handleMarkEnd());
    analysisTableBody.addEventListener('input', (e) => { if (e.target.classList.contains('mtm-code-cell')) { const cell = e.target; const mtmCode = cell.innerText.trim().toUpperCase(); const tmuCell = cell.parentElement.querySelector('.tmu-cell'); if (mtmCode.length >= 2) fetchTMU(mtmCode, tmuCell); else tmuCell.textContent = ''; } });
    document.addEventListener('keydown', (e) => { if (e.key.toLowerCase() === 'i') markStartBtn.click(); if (e.key.toLowerCase() === 'f') markEndBtn.click(); });
    saveConfigBtn.addEventListener('click', handleSaveConfig);
    loadConfigInput.addEventListener('change', handleLoadConfig);
    generateReportBtn.addEventListener('click', handleGenerateReport);
    closeButton.addEventListener('click', () => { reportModal.style.display = 'none'; });
    window.addEventListener('click', (event) => { if (event.target == reportModal) { reportModal.style.display = 'none'; } });

    // ... (resto das funções, sem alterações)
    const updateSummary = () => { const allRows = analysisTableBody.querySelectorAll('tr'); const standardTimeCells = document.querySelectorAll('.standard-time-cell'); let totalStandardTime = 0; standardTimeCells.forEach(cell => { const timeValue = parseFloat(cell.textContent); if (!isNaN(timeValue)) { totalStandardTime += timeValue; } }); const totalElements = allRows.length; const averageTime = totalElements > 0 ? totalStandardTime / totalElements : 0; totalStandardTimeEl.textContent = `${totalStandardTime.toFixed(2)} s`; totalElementsEl.textContent = totalElements; averageTimeEl.textContent = `${averageTime.toFixed(2)} s`; };
    const handleMarkEnd = async () => { if (startTime === null) { alert("Por favor, marque o início do movimento primeiro!"); return; } const endTime = videoPlayer.currentTime; if (endTime <= startTime) { alert("O tempo final deve ser maior que o tempo inicial."); return; } elementCounter++; const delta = endTime - startTime; const ritmo = parseFloat(ritmoInput.value); const suplemento = parseFloat(suplementoInput.value); const standardTime = await calculateStandardTime(delta, ritmo, suplemento); const newRow = analysisTableBody.insertRow(); newRow.innerHTML = `<td>${elementCounter}</td><td>${startTime.toFixed(3)}</td><td>${endTime.toFixed(3)}</td><td>${delta.toFixed(3)}</td><td contenteditable="true" class="description-cell"></td><td contenteditable="true" class="mtm-code-cell"></td><td class="tmu-cell"></td><td class="standard-time-cell">${standardTime.toFixed(4)}</td>`; startTime = null; markStartBtn.style.backgroundColor = ''; updateSummary(); };
    const handleGenerateReport = async () => { const tableData = []; const rows = analysisTableBody.querySelectorAll('tr'); if (rows.length === 0) { alert("A tabela de análise está vazia. Adicione movimentos para gerar um laudo."); return; } rows.forEach(row => { const cells = row.querySelectorAll('td'); tableData.push({ id: cells[0].textContent, delta: cells[3].textContent, description: cells[4].textContent, mtmCode: cells[5].textContent }); }); generateReportBtn.textContent = 'Analisando...'; generateReportBtn.disabled = true; try { const response = await fetch(`${API_URL}/api/generate_report`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tableData) }); if (!response.ok) throw new Error('Falha ao gerar o laudo a partir da API.'); const data = await response.json(); reportText.textContent = data.report; reportModal.style.display = 'block'; } catch (error) { alert(error.message); console.error("Erro ao gerar laudo:", error); } finally { generateReportBtn.textContent = 'Gerar Laudo IA'; generateReportBtn.disabled = false; } };
    async function calculateStandardTime(delta, ritmo, suplemento) { try { const response = await fetch(`${API_URL}/api/calculate_standard_time`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ delta, ritmo, suplemento }) }); if (!response.ok) return 0; const data = await response.json(); return data.tempo_padrao; } catch (error) { console.error("Erro ao calcular tempo padrão:", error); return 0; } }
    async function fetchTMU(code, targetCell) { try { const response = await fetch(`${API_URL}/api/get_tmu/${code}`); if (!response.ok) { targetCell.textContent = 'N/A'; return; } const data = await response.json(); targetCell.textContent = data.tmu; } catch (error) { console.error("Erro ao conectar com o backend:", error); targetCell.textContent = 'Erro'; } }
    const handleSaveConfig = () => { const config = { ritmo: ritmoInput.value, suplemento: suplementoInput.value }; const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'config_mtm.json'; a.click(); URL.revokeObjectURL(url); };
    const handleLoadConfig = (event) => { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = function (e) { try { const config = JSON.parse(e.target.result); if (config.ritmo) ritmoInput.value = config.ritmo; if (config.suplemento) suplementoInput.value = config.suplemento; } catch (error) { alert("Erro ao ler o arquivo de configuração."); } }; reader.readAsText(file); };
});
