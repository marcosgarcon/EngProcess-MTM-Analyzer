// VERSÃO 1.1 - COM EXPORTAÇÃO PARA CSV

document.addEventListener('DOMContentLoaded', () => {

    // 1. REFERÊNCIAS A TODOS OS ELEMENTOS DA PÁGINA (DOM)
    const videoUpload = document.getElementById('videoUpload');
    const videoPlayer = document.getElementById('videoPlayer');
    const canvasElement = document.getElementById('outputCanvas');
    const canvasCtx = canvasElement.getContext('2d');
    const markStartBtn = document.getElementById('markStartBtn');
    const markEndBtn = document.getElementById('markEndBtn');
    const analysisTableBody = document.querySelector("#analysisTable tbody");
    const ritmoInput = document.getElementById('ritmo');
    const suplementoInput = document.getElementById('suplemento');
    const autoMarkCheckbox = document.getElementById('autoMarkCheckbox');
    const sensitivitySlider = document.getElementById('sensitivitySlider');
    const sensitivityValue = document.getElementById('sensitivityValue');
    const saveConfigBtn = document.getElementById('saveConfigBtn');
    const loadConfigInput = document.getElementById('loadConfigInput');
    const totalStandardTimeEl = document.getElementById('total-standard-time');
    const totalElementsEl = document.getElementById('total-elements');
    const averageTimeEl = document.getElementById('average-time');
    const generateReportBtn = document.getElementById('generateReportBtn');
    const reportModal = document.getElementById('reportModal');
    const reportText = document.getElementById('report-text');
    const closeButton = document.querySelector('.close-button');
    const exportCsvBtn = document.getElementById('exportCsvBtn'); // Nova referência

    // 2. VARIÁVEIS DE ESTADO DO APLICATIVO
    const API_URL = 'http://localhost:5000';
    let startTime = null;
    let elementCounter = 0;
    let autoMarkEnabled = false;
    let lastHandPosition = null;
    let isHandMoving = false;
    let MOVEMENT_THRESHOLD = 0.008;
    let movementCooldown = 0;

    // 3. INICIALIZAÇÃO DO MEDIAPIPE (IA)
    const hands = new Hands({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
    hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.7, minTrackingConfidence: 0.7 });
    hands.onResults(onResults);

    // 4. DEFINIÇÃO DE TODAS AS FUNÇÕES
    
    // ****** NOVA FUNÇÃO PARA EXPORTAR CSV ******
    function exportTableToCSV(filename) {
        if (analysisTableBody.rows.length === 0) {
            alert("A tabela de análise está vazia. Não há nada para exportar.");
            return;
        }
        
        let csvContent = "";
        const rows = document.querySelectorAll("#analysisTable tr");
        
        rows.forEach(row => {
            const cols = row.querySelectorAll("td, th");
            const rowData = [];
            cols.forEach(col => {
                let data = col.innerText.replace(/"/g, '""');
                rowData.push(`"${data}"`);
            });
            csvContent += rowData.join(",") + "\r\n";
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // O resto das funções continua igual...
    function updateSummary() { const allRows = analysisTableBody.querySelectorAll('tr'); const standardTimeCells = document.querySelectorAll('.standard-time-cell'); let totalStandardTime = 0; standardTimeCells.forEach(cell => { const timeValue = parseFloat(cell.textContent); if (!isNaN(timeValue)) totalStandardTime += timeValue; }); const totalElements = allRows.length; const averageTime = totalElements > 0 ? totalStandardTime / totalElements : 0; totalStandardTimeEl.textContent = `${totalStandardTime.toFixed(2)} s`; totalElementsEl.textContent = totalElements; averageTimeEl.textContent = `${averageTime.toFixed(2)} s`; };
    async function calculateStandardTime(delta, ritmo, suplemento) { try { const response = await fetch(`${API_URL}/api/calculate_standard_time`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ delta, ritmo, suplemento }) }); if (!response.ok) return 0; const data = await response.json(); return data.tempo_padrao; } catch (error) { return 0; } }
    async function handleMarkEnd() { if (startTime === null) return; const endTime = videoPlayer.currentTime; if (endTime <= startTime) return; elementCounter++; const delta = endTime - startTime; const ritmo = parseFloat(ritmoInput.value); const suplemento = parseFloat(suplementoInput.value); const standardTime = await calculateStandardTime(delta, ritmo, suplemento); const newRow = analysisTableBody.insertRow(); newRow.innerHTML = `<td>${elementCounter}</td><td>${startTime.toFixed(3)}</td><td>${endTime.toFixed(3)}</td><td>${delta.toFixed(3)}</td><td contenteditable="true"></td><td contenteditable="true" class="mtm-code-cell"></td><td class="tmu-cell"></td><td class="standard-time-cell">${standardTime.toFixed(4)}</td>`; startTime = null; markStartBtn.style.backgroundColor = ''; updateSummary(); };
    async function fetchTMU(code, targetCell) { try { const response = await fetch(`${API_URL}/api/get_tmu/${code}`); if (!response.ok) { targetCell.textContent = 'N/A'; return; } const data = await response.json(); targetCell.textContent = data.tmu; } catch (error) { targetCell.textContent = 'Erro'; } }
    async function handleGenerateReport() { const tableData = []; const rows = analysisTableBody.querySelectorAll('tr'); if (rows.length === 0) { alert("A tabela de análise está vazia."); return; } rows.forEach(row => { const cells = row.querySelectorAll('td'); if (cells.length >= 6) { tableData.push({ id: cells[0]?.textContent || '', delta: cells[3]?.textContent || '0', description: cells[4]?.textContent || '', mtmCode: cells[5]?.textContent || '' }); } }); generateReportBtn.textContent = 'Analisando...'; generateReportBtn.disabled = true; try { const response = await fetch(`${API_URL}/api/generate_report`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tableData) }); if (!response.ok) throw new Error('Falha ao gerar o laudo.'); const data = await response.json(); reportText.textContent = data.report; reportModal.style.display = 'block'; } catch (error) { alert(error.message); } finally { generateReportBtn.textContent = 'Gerar Laudo IA'; generateReportBtn.disabled = false; } };
    function handleSaveConfig() { const config = { ritmo: ritmoInput.value, suplemento: suplementoInput.value }; const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'config_mtm.json'; a.click(); URL.revokeObjectURL(url); };
    function handleLoadConfig(event) { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = function(e) { try { const config = JSON.parse(e.target.result); if (config.ritmo) ritmoInput.value = config.ritmo; if (config.suplemento) suplementoInput.value = config.suplemento; } catch (error) { alert("Erro ao ler o arquivo."); } }; reader.readAsText(file); };
    function onResults(results) { canvasElement.width = videoPlayer.videoWidth; canvasElement.height = videoPlayer.videoHeight; canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height); canvasCtx.drawImage(videoPlayer, 0, 0, canvasElement.width, canvasElement.height); if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) { const handLandmarks = results.multiHandLandmarks[0]; drawConnectors(canvasCtx, handLandmarks, HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 5 }); drawLandmarks(canvasCtx, handLandmarks, { color: '#FF0000', lineWidth: 2 }); if (autoMarkEnabled && movementCooldown <= 0) { const wrist = handLandmarks[0]; if (lastHandPosition) { const dx = wrist.x - lastHandPosition.x; const dy = wrist.y - lastHandPosition.y; const dz = wrist.z - lastHandPosition.z; const velocity = Math.sqrt(dx * dx + dy * dy + dz * dz); const wasHandMoving = isHandMoving; isHandMoving = velocity > MOVEMENT_THRESHOLD; if (isHandMoving !== wasHandMoving) { if (isHandMoving) { markStartBtn.click(); } else { markEndBtn.click(); } movementCooldown = 30; } } lastHandPosition = wrist; } } if (movementCooldown > 0) movementCooldown--; }
    async function processVideoFrame() { if (videoPlayer.paused || videoPlayer.ended) return; await hands.send({ image: videoPlayer }); requestAnimationFrame(processVideoFrame); }
    
    // 5. ASSOCIAÇÃO DE EVENTOS
    videoUpload.addEventListener('change', (e) => { const file = e.target.files[0]; if (file) { videoPlayer.src = URL.createObjectURL(file); videoPlayer.style.display = 'block'; } });
    videoPlayer.addEventListener('play', processVideoFrame);
    autoMarkCheckbox.addEventListener('change', (e) => { autoMarkEnabled = e.target.checked; if (autoMarkEnabled) { isHandMoving = false; lastHandPosition = null; } });
    sensitivitySlider.addEventListener('input', (e) => { MOVEMENT_THRESHOLD = e.target.value / 10000; sensitivityValue.textContent = MOVEMENT_THRESHOLD.toFixed(4); });
    markStartBtn.addEventListener('click', () => { startTime = videoPlayer.currentTime; markStartBtn.style.backgroundColor = '#28a745'; markEndBtn.style.backgroundColor = ''; });
    markEndBtn.addEventListener('click', handleMarkEnd);
    analysisTableBody.addEventListener('input', (e) => { const cell = e.target.closest('td'); if (cell && cell.classList.contains('mtm-code-cell')) { const mtmCode = cell.innerText.trim().toUpperCase(); const tmuCell = cell.parentElement.querySelector('.tmu-cell'); if (tmuCell) { if (mtmCode.length >= 2) { fetchTMU(mtmCode, tmuCell); } else { tmuCell.textContent = ''; } } } });
    document.addEventListener('keydown', (e) => { if (e.key.toLowerCase() === 'i') markStartBtn.click(); if (e.key.toLowerCase() === 'f') markEndBtn.click(); });
    saveConfigBtn.addEventListener('click', handleSaveConfig);
    loadConfigInput.addEventListener('change', handleLoadConfig);
    generateReportBtn.addEventListener('click', handleGenerateReport);
    closeButton.addEventListener('click', () => { reportModal.style.display = 'none'; });
    window.addEventListener('click', (event) => { if (event.target == reportModal) { reportModal.style.display = 'none'; } });

    // Novo listener para o nosso novo botão
    exportCsvBtn.addEventListener('click', () => {
        exportTableToCSV('cronoanalise.csv');
    });
});
