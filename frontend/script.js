// VERSÃO FINAL CORRIGIDA - 8 de Julho

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. REFERÊNCIAS A ELEMENTOS DO DOM ---
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

    // --- 2. VARIÁVEIS DE ESTADO E CONFIGURAÇÃO ---
    const API_URL = 'http://localhost:5000';
    let startTime = null;
    let elementCounter = 0;
    let autoMarkEnabled = false;
    let lastHandPosition = null;
    let isHandMoving = false;
    let MOVEMENT_THRESHOLD = 0.008;
    let movementCooldown = 0;

    // --- 3. DEFINIÇÃO DAS FUNÇÕES PRINCIPAIS ---

    const updateSummary = () => {
        const allRows = analysisTableBody.querySelectorAll('tr');
        const standardTimeCells = document.querySelectorAll('.standard-time-cell');
        let totalStandardTime = 0;
        standardTimeCells.forEach(cell => {
            const timeValue = parseFloat(cell.textContent);
            if (!isNaN(timeValue)) {
                totalStandardTime += timeValue;
            }
        });
        const totalElements = allRows.length;
        const averageTime = totalElements > 0 ? totalStandardTime / totalElements : 0;
        totalStandardTimeEl.textContent = `${totalStandardTime.toFixed(2)} s`;
        totalElementsEl.textContent = totalElements;
        averageTimeEl.textContent = `${averageTime.toFixed(2)} s`;
    };

    const handleMarkEnd = async () => {
        if (startTime === null) {
            console.warn("Marcação de Fim ignorada: Início não foi marcado.");
            return;
        }
        const endTime = videoPlayer.currentTime;
        if (endTime <= startTime) {
            console.warn("Marcação de Fim ignorada: Tempo final <= tempo inicial.");
            return;
        }
        elementCounter++;
        const delta = endTime - startTime;
        const ritmo = parseFloat(ritmoInput.value);
        const suplemento = parseFloat(suplementoInput.value);
        const standardTime = await calculateStandardTime(delta, ritmo, suplemento);
        const newRow = analysisTableBody.insertRow();
        newRow.innerHTML = `<td>${elementCounter}</td><td>${startTime.toFixed(3)}</td><td>${endTime.toFixed(3)}</td><td>${delta.toFixed(3)}</td><td contenteditable="true" class="description-cell"></td><td contenteditable="true" class="mtm-code-cell"></td><td class="tmu-cell"></td><td class="standard-time-cell">${standardTime.toFixed(4)}</td>`;
        startTime = null;
        markStartBtn.style.backgroundColor = '';
        updateSummary();
    };
    
    // ****** FUNÇÃO CORRIGIDA ******
    const handleGenerateReport = async () => {
        const tableData = [];
        const rows = analysisTableBody.querySelectorAll('tr');
        if (rows.length === 0) {
            alert("A tabela de análise está vazia. Adicione movimentos para gerar um laudo.");
            return;
        }

        // Lógica "À Prova de Balas" para ler os dados da tabela
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 6) { // Verifica se a linha tem o mínimo de células esperado
                const rowData = {
                    id: cells[0] ? cells[0].textContent : '',
                    delta: cells[3] ? cells[3].textContent : '0',
                    description: cells[4] ? cells[4].textContent : '',
                    mtmCode: cells[5] ? cells[5].textContent : ''
                };
                tableData.push(rowData);
            }
        });
        
        generateReportBtn.textContent = 'Analisando...';
        generateReportBtn.disabled = true;
        try {
            const response = await fetch(`${API_URL}/api/generate_report`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(tableData)
            });
            if (!response.ok) throw new Error('Falha ao gerar o laudo a partir da API.');
            const data = await response.json();
            reportText.textContent = data.report;
            reportModal.style.display = 'block';
        } catch (error) {
            alert(error.message);
        } finally {
            generateReportBtn.textContent = 'Gerar Laudo IA';
            generateReportBtn.disabled = false;
        }
    };

    async function calculateStandardTime(delta, ritmo, suplemento) {
        try {
            const response = await fetch(`${API_URL}/api/calculate_standard_time`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ delta, ritmo, suplemento })
            });
            if (!response.ok) return 0;
            const data = await response.json();
            return data.tempo_padrao;
        } catch (error) {
            console.error("Erro ao calcular tempo padrão:", error);
            return 0;
        }
    }

    async function fetchTMU(code, targetCell) {
        try {
            const response = await fetch(`${API_URL}/api/get_tmu/${code}`);
            if (!response.ok) {
                targetCell.textContent = 'N/A';
                return;
            }
            const data = await response.json();
            targetCell.textContent = data.tmu;
        } catch (error) {
            console.error("Erro ao conectar com o backend:", error);
            targetCell.textContent = 'Erro';
        }
    }

    const handleSaveConfig = () => {
        const config = { ritmo: ritmoInput.value, suplemento: suplementoInput.value };
        const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'config_mtm.json';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleLoadConfig = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const config = JSON.parse(e.target.result);
                if (config.ritmo) ritmoInput.value = config.ritmo;
                if (config.suplemento) suplementoInput.value = config.suplemento;
            } catch (error) {
                alert("Erro ao ler o arquivo de configuração.");
            }
        };
        reader.readAsText(file);
    };

    function onResults(results) {
        canvasElement.width = videoPlayer.videoWidth;
        canvasElement.height = videoPlayer.videoHeight;
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        canvasCtx.drawImage(videoPlayer, 0, 0, canvasElement.width, canvasElement.height);
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const handLandmarks = results.multiHandLandmarks[0];
