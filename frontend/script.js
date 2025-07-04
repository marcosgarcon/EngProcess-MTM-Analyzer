document.addEventListener('DOMContentLoaded', () => {
    // --- REFERÊNCIAS AOS ELEMENTOS DO DOM ---
    const videoUpload = document.getElementById('videoUpload');
    const videoPlayer = document.getElementById('videoPlayer');
    const markStartBtn = document.getElementById('markStartBtn');
    const markEndBtn = document.getElementById('markEndBtn');
    const analysisTableBody = document.querySelector("#analysisTable tbody");
    const ritmoInput = document.getElementById('ritmo');
    const suplementoInput = document.getElementById('suplemento');
    const saveConfigBtn = document.getElementById('saveConfigBtn');
    const loadConfigInput = document.getElementById('loadConfigInput');
    // Referências para o Sumário
    const totalStandardTimeEl = document.getElementById('total-standard-time');
    const totalElementsEl = document.getElementById('total-elements');
    const averageTimeEl = document.getElementById('average-time');
    // Novas referências para o Modal do Laudo
    const generateReportBtn = document.getElementById('generateReportBtn');
    const reportModal = document.getElementById('reportModal');
    const reportText = document.getElementById('report-text');
    const closeButton = document.querySelector('.close-button');

    const API_URL = 'http://127.0.0.1:5000';
    let startTime = null;
    let elementCounter = 0;

    // --- FUNÇÕES DE CÁLCULO E ATUALIZAÇÃO ---
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

    // --- FUNÇÕES DE INTERAÇÃO PRINCIPAL ---
    const handleMarkEnd = async () => {
        if (startTime === null) {
            alert("Por favor, marque o início do movimento primeiro!");
            return;
        }
        const endTime = videoPlayer.currentTime;
        if (endTime <= startTime) {
            alert("O tempo final deve ser maior que o tempo inicial.");
            return;
        }
        
        elementCounter++;
        const delta = endTime - startTime;
        
        const ritmo = parseFloat(ritmoInput.value);
        const suplemento = parseFloat(suplementoInput.value);

        const standardTime = await calculateStandardTime(delta, ritmo, suplemento);

        const newRow = analysisTableBody.insertRow();
        newRow.innerHTML = `
            <td>${elementCounter}</td>
            <td>${startTime.toFixed(3)}</td>
            <td>${endTime.toFixed(3)}</td>
            <td>${delta.toFixed(3)}</td>
            <td contenteditable="true" class="description-cell"></td>
            <td contenteditable="true" class="mtm-code-cell"></td>
            <td class="tmu-cell"></td>
            <td class="standard-time-cell">${standardTime.toFixed(4)}</td>
        `;

        startTime = null; 
        markStartBtn.style.backgroundColor = '';
        updateSummary(); 
    };

    const handleGenerateReport = async () => {
        const tableData = [];
        const rows = analysisTableBody.querySelectorAll('tr');
        if (rows.length === 0) {
            alert("A tabela de análise está vazia. Adicione movimentos para gerar um laudo.");
            return;
        }

        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            tableData.push({
                id: cells[0].textContent,
                delta: cells[3].textContent,
                description: cells[4].textContent,
                mtmCode: cells[5].textContent
            });
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
            console.error("Erro ao gerar laudo:", error);
        } finally {
            generateReportBtn.textContent = 'Gerar Laudo IA';
            generateReportBtn.disabled = false;
        }
    };

    // --- FUNÇÕES DE API (BACKEND) ---
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

    // --- FUNÇÕES DE CONFIGURAÇÃO (JSON) ---
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

    // --- EVENT LISTENERS (OUVINTES DE EVENTOS) ---
    videoUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) videoPlayer.src = URL.createObjectURL(file);
    });
    
    markStartBtn.addEventListener('click', () => {
        startTime = videoPlayer.currentTime;
        markStartBtn.style.backgroundColor = '#28a745'; 
        markEndBtn.style.backgroundColor = ''; 
    });
    
    markEndBtn.addEventListener('click', handleMarkEnd);

    analysisTableBody.addEventListener('input', (e) => {
        if (e.target.classList.contains('mtm-code-cell')) {
            const cell = e.target;
            const mtmCode = cell.innerText.trim().toUpperCase();
            const tmuCell = cell.parentElement.querySelector('.tmu-cell');
            if (mtmCode.length >= 2) fetchTMU(mtmCode, tmuCell);
            else tmuCell.textContent = '';
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 'i') markStartBtn.click();
        if (e.key.toLowerCase() === 'f') markEndBtn.click();
    });

    saveConfigBtn.addEventListener('click', handleSaveConfig);
    loadConfigInput.addEventListener('change', handleLoadConfig);

    // Listeners para o Laudo IA
    generateReportBtn.addEventListener('click', handleGenerateReport);
    closeButton.addEventListener('click', () => {
        reportModal.style.display = 'none';
    });
    window.addEventListener('click', (event) => {
        if (event.target == reportModal) {
            reportModal.style.display = 'none';
        }
    });
});
