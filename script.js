const TOTAL_NUMBERS = 100; // Configurable: 00 al 99
let soldNumbers = JSON.parse(localStorage.getItem('raffle_sold')) || {}; 
let selectedNumbers = new Set();

function initGrid() {
  const grid = document.getElementById('grid');
  grid.innerHTML = '';

  for (let i = 0; i < TOTAL_NUMBERS; i++) {
    const numFormatted = i.toString().padStart(2, '0');
    const box = document.createElement('div');
    box.className = 'num-box';
    box.textContent = numFormatted;
    box.dataset.num = numFormatted;

    if (soldNumbers[numFormatted]) {
      box.classList.add('sold');
      box.title = `Vendido a: ${soldNumbers[numFormatted]}`;
    } else if (selectedNumbers.has(numFormatted)) {
      box.classList.add('selected');
    } else {
      box.classList.add('available');
    }

    box.addEventListener('click', () => toggleNumber(numFormatted));
    grid.appendChild(box);
  }

  updateUI();
}

function toggleNumber(num) {
  if (soldNumbers[num]) return; // Si ya fue comprado, no hacer nada

  if (selectedNumbers.has(num)) {
    selectedNumbers.delete(num);
  } else {
    selectedNumbers.add(num);
  }

  renderGridState();
  updateUI();
}

function renderGridState() {
  document.querySelectorAll('.num-box').forEach(box => {
    const num = box.dataset.num;
    box.className = 'num-box';
    
    if (soldNumbers[num]) {
      box.classList.add('sold');
      box.title = `Vendido a: ${soldNumbers[num]}`;
    } else if (selectedNumbers.has(num)) {
      box.classList.add('selected');
    } else {
      box.classList.add('available');
    }
  });
}

function updateUI() {
  // Actualizar tags de los números actualmente seleccionados
  const container = document.getElementById('selectedTags');
  container.innerHTML = '';
  
  if (selectedNumbers.size === 0) {
    container.innerHTML = '<span style="color: var(--text-muted); font-size: 0.8rem;">Haz clic en los números...</span>';
  } else {
    Array.from(selectedNumbers).sort().forEach(num => {
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = num;
      container.appendChild(tag);
    });
  }

  // Contadores / Estadísticas
  const soldCount = Object.keys(soldNumbers).length;
  const selectedCount = selectedNumbers.size;
  const availableCount = TOTAL_NUMBERS - soldCount - selectedCount;

  document.getElementById('statAvailable').textContent = availableCount;
  document.getElementById('statSelected').textContent = selectedCount;
  document.getElementById('statSold').textContent = soldCount;

  // Habilitar / deshabilitar botón de compra
  const buyerName = document.getElementById('buyerName').value.trim();
  document.getElementById('btnBuy').disabled = !(buyerName.length > 0 && selectedNumbers.size > 0);

  // Tabla con compradores
  renderTable();
}

function renderTable() {
  const tbody = document.getElementById('soldTableBody');
  tbody.innerHTML = '';

  const sortedKeys = Object.keys(soldNumbers).sort();

  sortedKeys.forEach(num => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight: bold; color: var(--sold);">${num}</td>
      <td>${soldNumbers[num]}</td>
      <td><button class="delete-btn" onclick="releaseNumber('${num}')">Liberar</button></td>
    `;
    tbody.appendChild(tr);
  });
}

function registerPurchase() {
  const buyerInput = document.getElementById('buyerName');
  const name = buyerInput.value.trim();

  if (!name || selectedNumbers.size === 0) return;

  selectedNumbers.forEach(num => {
    soldNumbers[num] = name;
  });

  selectedNumbers.clear();
  buyerInput.value = '';
  
  saveData();
  renderGridState();
  updateUI();
}

function releaseNumber(num) {
  if (confirm(`¿Deseas liberar el número ${num}?`)) {
    delete soldNumbers[num];
    saveData();
    renderGridState();
    updateUI();
  }
}

function saveData() {
  localStorage.setItem('raffle_sold', JSON.stringify(soldNumbers));
}

// Escuchar cambios de escritura en el campo del comprador
document.getElementById('buyerName').addEventListener('input', updateUI);

// Inicializar cuadrícula al cargar
document.addEventListener('DOMContentLoaded', initGrid);