// VERSÃO ESTÁVEL E DEFINITIVA - 8 de Julho

// Envolvemos todo o código no 'DOMContentLoaded' para garantir que o HTML está pronto.
document.addEventListener('DOMContentLoaded', () => {

    // ===================================================================
    // 1. REFERÊNCIAS A ELEMENTOS DA PÁGINA (DOM)
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
    // 3. INICIALIZAÇÃO DO MEDIAPIPE (IA)
    // ===================================================================
    const hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });
    hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7
    });
    hands.onResults(onResults);

    // ===================================================================
    // 4. DEFINIÇÃO DE TODAS AS FUNÇÕES
    // (Usar 'function' em vez de 'const' torna o código mais robusto a erros de ordem)
    // ===================================================================

    function updateSummary() {
        const allRows = analysisTableBody.querySelectorAll('tr');
        const standardTimeCells = document.querySelectorAll('.standard-time-cell');
        let totalStandardTime = 0;
        standardTimeCells.forEach(cell => {
            const timeValue = parseFloat(cell.textContent);
            if (!isNaN(timeValue)) totalStandardTime += timeValue;
