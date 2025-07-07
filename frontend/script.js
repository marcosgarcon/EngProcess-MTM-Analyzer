// VERSÃO 1.1 ESTÁVEL

document.addEventListener('DOMContentLoaded', () => {

    // 1. REFERÊNCIAS
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
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    const reportModal = document.getElementById('reportModal');
    const reportText = document.getElementById('report-text');
    const closeButton = document.querySelector('.close-button');
    
    // 2. VARIÁVEIS
    const API_URL = 'http://localhost:5000';
    let startTime = null;
    let elementCounter = 0;
    let autoMarkEnabled = false;
    let lastHandPosition = null;
    let isHandMoving = false;
    let MOVEMENT_THRESHOLD = 0.008;
    let movementCooldown = 0;

    // 3. INICIALIZAÇÃO DA IA
    const hands = new Hands({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
    hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.7, minTrackingConfidence: 0.7 });
    hands.onResults(onResults);

    // 4. DEFINIÇÃO DE FUNÇÕES
    function exportTableToCSV(filename) {
        if (analysisTableBody.rows.length === 0) {
            alert("A tabela está vazia.");
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
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function updateSummary() { const allRows = analysisTableBody.querySelectorAll('tr'); const standardTimeCells = document.querySelectorAll('.standard-time-cell'); let t = 0; standardTimeCells.forEach(cell => { const v = parseFloat(cell.textContent); if (!isNaN(v)) t += v; }); const e = allRows.length; const a = e > 0 ? t / e : 0; totalStandardTimeEl.textContent = `${t.toFixed(2)} s`; totalElementsEl.textContent = e; averageTimeEl.textContent = `${a.toFixed(2)} s`; };
    async function calculateStandardTime(delta, ritmo, suplemento) { try { const r = await fetch(`${API_URL}/api/calculate_standard_time`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ delta, ritmo, suplemento }) }); if (!r.ok) return 0; const d = await r.json(); return d.tempo_padrao; } catch (e) { return 0; } }
    async function handleMarkEnd() { if (startTime === null) return; const e = videoPlayer.currentTime; if (e <= startTime) return; elementCounter++; const d = e - startTime; const r = parseFloat(ritmoInput.value); const s = parseFloat(suplementoInput.value); const t = await calculateStandardTime(d, r, s); const n = analysisTableBody.insertRow(); n.innerHTML = `<td>${elementCounter}</td><td>${startTime.toFixed(3)}</td><td>${e.toFixed(3)}</td><td>${d.toFixed(3)}</td><td contenteditable="true"></td><td contenteditable="true" class="mtm-code-cell"></td><td class="tmu-cell"></td><td class="standard-time-cell">${t.toFixed(4)}</td>`; startTime = null; markStartBtn.style.backgroundColor = ''; updateSummary(); };
    async function fetchTMU(code, targetCell) { try { const r = await fetch(`${API_URL}/api/get_tmu/${code}`); if (!r.ok) { targetCell.textContent = 'N/A'; return; } const d = await r.json(); targetCell.textContent = d.tmu; } catch (e) { targetCell.textContent = 'Erro'; } }
    async function handleGenerateReport() { const t = []; const r = analysisTableBody.querySelectorAll('tr'); if (r.length === 0) { alert("A tabela está vazia."); return; } r.forEach(row => { const c = row.querySelectorAll('td'); if (c.length >= 6) { t.push({ id: c[0]?.textContent || '', delta: c[3]?.textContent || '0', description: c[4]?.textContent || '', mtmCode: c[5]?.textContent || '' }); } }); generateReportBtn.textContent = 'Analisando...'; generateReportBtn.disabled = true; try { const res = await fetch(`${API_URL}/api/generate_report`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(t) }); if (!res.ok) throw new Error('Falha ao gerar o laudo.'); const d = await res.json(); reportText.textContent = d.report; reportModal.style.display = 'block'; } catch (e) { alert(e.message); } finally { generateReportBtn.textContent = 'Gerar Laudo IA'; generateReportBtn.disabled = false; } };
    function handleSaveConfig() { const c = { ritmo: ritmoInput.value, suplemento: suplementoInput.value }; const b = new Blob([JSON.stringify(c, null, 2)], { type: 'application/json' }); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = 'config_mtm.json'; a.click(); URL.revokeObjectURL(u); };
    function handleLoadConfig(event) { const f = event.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = function(e) { try { const c = JSON.parse(e.target.result); if (c.ritmo) ritmoInput.value = c.ritmo; if (c.suplemento) suplementoInput.value = c.suplemento; } catch (e) { alert("Erro ao ler o arquivo."); } }; r.readAsText(f); };
    function onResults(results) { canvasElement.width = videoPlayer.videoWidth; canvasElement.height = videoPlayer.videoHeight; canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height); canvasCtx.drawImage(videoPlayer, 0, 0, canvasElement.width, canvasElement.height); if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) { const h = results.multiHandLandmarks[0]; drawConnectors(canvasCtx, h, HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 5 }); drawLandmarks(canvasCtx, h, { color: '#FF0000', lineWidth: 2 }); if (autoMarkEnabled && movementCooldown <= 0) { const w = h[0]; if (lastHandPosition) { const dx = w.x - lastHandPosition.x, dy = w.y - lastHandPosition.y, dz = w.z - lastHandPosition.z; const v = Math.sqrt(dx * dx + dy * dy + dz * dz); const wm = isHandMoving; isHandMoving = v > MOVEMENT_THRESHOLD; if (isHandMoving !== wm) { if (isHandMoving) { markStartBtn.click(); } else { markEndBtn.click(); } movementCooldown = 30; } } lastHandPosition = w; } } if (movementCooldown > 0) movementCooldown--; }
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
    exportCsvBtn.addEventListener('click', () => exportTableToCSV('cronoanalise.csv'));
    closeButton.addEventListener('click', () => { reportModal.style.display = 'none'; });
    window.addEventListener('click', (event) => { if (event.target == reportModal) { reportModal.style.display = 'none'; } });
});
