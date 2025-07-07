// VERSÃO CORRIGIDA E ESTÁVEL - 8 de Julho (Final)

document.addEventListener('DOMContentLoaded', () => {

    // ===================================================================
    // 1. REFERÊNCIAS A TODOS OS ELEMENTOS DA PÁGINA (DOM)
    // ===================================================================
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

    // ===================================================================
    // 2. VARIÁVEIS DE ESTADO DO APLICATIVO
    // ===================================================================
    const API_URL = 'http://localhost:5000';
    let startTime = null;
    let elementCounter = 0;
    let autoMarkEnabled = false;
    let lastHandPosition = null;
    let isHandMoving = false;
    let MOVEMENT_THRESHOLD = 0.008;
    let movementCooldown = 0;

    // ===================================================================
    // 3. DEFINIÇÃO DE TODAS AS FUNÇÕES
    // (Definimos todas as funções primeiro, antes de as usarmos)
    // ===================================================================

    const updateSummary = () => {
        const allRows = analysisTableBody.querySelectorAll('tr');
        const standardTimeCells = document.querySelectorAll('.standard-time-cell');
        let totalStandardTime = 0;
        standardTimeCells.forEach(cell => {
            const timeValue = parseFloat(cell.textContent);
            if (!isNaN(timeValue)) totalStandardTime += timeValue;
        });
        const totalElements = allRows.length;
        const averageTime = totalElements > 0 ? totalStandardTime / totalElements : 0;
        totalStandardTimeEl.textContent = `${totalStandardTime.toFixed(2)} s`;
        totalElementsEl.textContent = totalElements;
        averageTimeEl.textContent = `${averageTime.toFixed(2)} s`;
    };

    async function calculateStandardTime(delta, ritmo, suplemento) {
        try {
            const response = await fetch(`${API_URL}/api/calculate_standard_time`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ delta, ritmo, suplemento })
            });
            if (!response.ok) return 0;
            const data = await response.json();
            return data.tempo_padrao;
        } catch (error) { return 0; }
    }

    const handleMarkEnd = async () => {
        if (startTime === null) return;
        const endTime = videoPlayer.currentTime;
        if (endTime <= startTime) return;
        
        elementCounter++;
