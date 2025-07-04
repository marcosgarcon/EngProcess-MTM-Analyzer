// Referências para o Sumário
const totalStandardTimeEl = document.getElementById('total-standard-time');
const totalElementsEl = document.getElementById('total-elements');
const averageTimeEl = document.getElementById('average-time');document.addEventListener('DOMContentLoaded', () => {
    const videoUpload = document.getElementById('videoUpload');
    const videoPlayer = document.getElementById('videoPlayer');
    const markStartBtn = document.getElementById('markStartBtn');
    const markEndBtn = document.getElementById('markEndBtn');
    const analysisTableBody = document.querySelector("#analysisTable tbody");
    
    // URL da nossa API no backend. Garanta que seu servidor python está rodando!
    const API_URL = 'http://127.0.0.1:5000';

    let startTime = null;
    let elementCounter = 0;

    videoUpload.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            const fileURL = URL.createObjectURL(file);
            videoPlayer.src = fileURL;
        }
    });

    markStartBtn.addEventListener('click', () => {
        startTime = videoPlayer.currentTime;
        markStartBtn.style.backgroundColor = '#28a745'; 
        markEndBtn.style.backgroundColor = ''; 
    });

    markEndBtn.addEventListener('click', () => {
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
        
        const newRow = analysisTableBody.insertRow();
        newRow.innerHTML = `
            <td>${elementCounter}</td>
            <td>${startTime.toFixed(3)}</td>
            <td>${endTime.toFixed(3)}</td>
            <td>${delta.toFixed(3)}</td>
            <td contenteditable="true" class="description-cell"></td>
            <td contenteditable="true" class="mtm-code-cell"></td>
            <td class="tmu-cell"></td>
        `;

        startTime = null; 
        markStartBtn.style.backgroundColor = '';
    });

    // --- NOVIDADE AQUI ---
    // Escuta por eventos na tabela de análise inteira
    analysisTableBody.addEventListener('input', function(event) {
        // Verifica se o evento aconteceu em uma célula de código MTM
        if (event.target.classList.contains('mtm-code-cell')) {
            const cell = event.target;
            const mtmCode = cell.innerText.trim();
            const row = cell.parentElement;
            const tmuCell = row.querySelector('.tmu-cell');

            // Se o código tiver pelo menos 2 caracteres, busca o TMU
            if (mtmCode.length >= 2) {
                fetchTMU(mtmCode, tmuCell);
            } else {
                tmuCell.textContent = ''; // Limpa o campo TMU se o código for apagado
            }
        }
    });

    // Função que chama nossa API no backend
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
    }// --- NOVA FUNÇÃO DE CÁLCULO DO SUMÁRIO ---
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

    // Atualiza o HTML
    totalStandardTimeEl.textContent = `${totalStandardTime.toFixed(2)} s`;
    totalElementsEl.textContent = totalElements;
    averageTimeEl.textContent = `${averageTime.toFixed(2)} s`;
};
    
    document.addEventListener('keydown', (e) => {
        if(e.key.toLowerCase() === 'i') markStartBtn.click();
        if(e.key.toLowerCase() === 'f') markEndBtn.click();
    });
});
