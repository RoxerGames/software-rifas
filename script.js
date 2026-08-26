import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  doc, 
  updateDoc,
  deleteDoc, 
  onSnapshot, 
  writeBatch 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// PEGA AQUÍ TU CONFIGURACIÓN DE FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyBZoIvHQaJj2Toye9q1O8O1y1QICpnvokg",
  authDomain: "software-rifas-de077.firebaseapp.com",
  projectId: "software-rifas-de077",
  storageBucket: "software-rifas-de077.firebasestorage.app",
  messagingSenderId: "690275251113",
  appId: "1:690275251113:web:e659eca409672e3dd2cab8"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const raffleCollection = collection(db, "numeros_rifa");

const TOTAL_NUMBERS = 100;
let soldNumbers = {};
let selectedNumbers = new Set();

function initGrid() {
  const grid = document.getElementById('grid');
  grid.innerHTML = '';

  for (let i = 0; i < TOTAL_NUMBERS; i++) {
    const numFormatted = i.toString().padStart(2, '0');
    const box = document.createElement('div');
    box.className = 'num-box available';
    box.textContent = numFormatted;
    box.dataset.num = numFormatted;

    box.addEventListener('click', () => toggleNumber(numFormatted));
    grid.appendChild(box);
  }
}

function toggleNumber(num) {
  if (soldNumbers[num]) return;

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
      const data = soldNumbers[num];
      const isPaid = data.status === 'pagado';
      box.classList.add(isPaid ? 'paid' : 'pending');
      box.title = `${data.buyer} (${isPaid ? 'Pagado' : 'Pendiente'})`;
    } else if (selectedNumbers.has(num)) {
      box.classList.add('selected');
      box.title = 'Seleccionado';
    } else {
      box.classList.add('available');
      box.title = 'Disponible';
    }
  });
}

function updateUI() {
  // 1. Tags seleccionados
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

  // 2. Conteo
  const availableList = [];
  let paidCount = 0;
  let pendingCount = 0;

  for (let i = 0; i < TOTAL_NUMBERS; i++) {
    const numStr = i.toString().padStart(2, '0');
    if (soldNumbers[numStr]) {
      if (soldNumbers[numStr].status === 'pagado') {
        paidCount++;
      } else {
        pendingCount++;
      }
    } else {
      availableList.push(numStr);
    }
  }

  const selectedCount = selectedNumbers.size;
  const availableCount = availableList.length - selectedCount;

  document.getElementById('statAvailable').textContent = availableCount;
  document.getElementById('statPaid').textContent = paidCount;
  document.getElementById('statPending').textContent = pendingCount;

  const buyerName = document.getElementById('buyerName').value.trim();
  document.getElementById('btnBuy').disabled = !(buyerName.length > 0 && selectedNumbers.size > 0);

  updateAvailableText(availableList);
  renderTable();

  // Si hay una consulta de ganador abierta, actualizarla automáticamente
  const currentWinnerQuery = document.getElementById('winnerInput').value.trim();
  if (currentWinnerQuery.length > 0) {
    checkWinner();
  }
}

function updateAvailableText(availableList) {
  const textArea = document.getElementById('availableText');
  if (availableList.length === 0) {
    textArea.value = "🎟️ ¡TODOS LOS NÚMEROS HAN SIDO RESERVADOS/VENDIDOS! 🎉";
    return;
  }

  const listFormatted = availableList.join(' - ');
  const message = `🎟️ *NÚMEROS DISPONIBLES DE LA RIFA* (${availableList.length} disponibles):\n\n${listFormatted}\n\n¡Elige el tuyo antes de que se agoten! ✨`;
  
  textArea.value = message;
}

window.copyAvailableText = function() {
  const textArea = document.getElementById('availableText');
  const btn = document.getElementById('btnCopy');
  
  navigator.clipboard.writeText(textArea.value).then(() => {
    const originalText = btn.textContent;
    btn.textContent = "✅ ¡Copiado!";
    btn.style.backgroundColor = "#10b981";

    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.backgroundColor = "";
    }, 2000);
  }).catch(err => {
    console.error("Error al copiar:", err);
    alert("No se pudo copiar automáticamente.");
  });
};

// Función para verificar el número ganador
window.checkWinner = function() {
  const input = document.getElementById('winnerInput');
  const resultBox = document.getElementById('winnerResult');
  let val = input.value.trim();

  if (val === '') {
    resultBox.style.display = 'none';
    return;
  }

  // Si ingresan 1 solo dígito (ej: "5"), formatearlo a "05"
  const formattedNum = val.padStart(2, '0');

  const winnerData = soldNumbers[formattedNum];
  resultBox.style.display = 'block';

  if (winnerData) {
    const isPaid = winnerData.status === 'pagado';
    resultBox.className = 'winner-box found';
    resultBox.innerHTML = `
      🎉 <strong>¡Número ${formattedNum} Registrado!</strong><br>
      👤 <strong>Comprador:</strong> ${winnerData.buyer}<br>
      💳 <strong>Estado:</strong> <span class="status-badge ${isPaid ? 'paid' : 'pending'}">${isPaid ? 'Pagado' : 'Pendiente'}</span>
    `;
  } else {
    resultBox.className = 'winner-box not-found';
    resultBox.innerHTML = `
      ℹ️ El número <strong>${formattedNum}</strong> <strong>NO fue vendido</strong> (está libre).
    `;
  }
};

function renderTable() {
  const tbody = document.getElementById('soldTableBody');
  tbody.innerHTML = '';

  const searchTerm = document.getElementById('searchBuyer').value.toLowerCase().trim();
  const sortedKeys = Object.keys(soldNumbers).sort();

  const filteredKeys = sortedKeys.filter(num => {
    const buyer = soldNumbers[num].buyer.toLowerCase();
    return buyer.includes(searchTerm) || num.includes(searchTerm);
  });

  if (filteredKeys.length === 0 && sortedKeys.length > 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="4" style="text-align: center; color: var(--text-muted); padding: 1rem;">No se encontraron compradores</td>`;
    tbody.appendChild(tr);
    return;
  }

  filteredKeys.forEach(num => {
    const data = soldNumbers[num];
    const isPaid = data.status === 'pagado';
    const tr = document.createElement('tr');
    
    tr.innerHTML = `
      <td style="font-weight: bold; color: ${isPaid ? 'var(--paid)' : 'var(--pending)'};">${num}</td>
      <td>${data.buyer}</td>
      <td>
        <button class="status-badge ${isPaid ? 'paid' : 'pending'}" title="Haz clic para alternar estado">
          ${isPaid ? 'Pagado' : 'Pendiente'}
        </button>
      </td>
      <td><button class="delete-btn" title="Liberar número">✕</button></td>
    `;

    tr.querySelector('.status-badge').addEventListener('click', () => toggleStatus(num, data.status));
    tr.querySelector('.delete-btn').addEventListener('click', () => releaseNumber(num));

    tbody.appendChild(tr);
  });
}

async function toggleStatus(num, currentStatus) {
  const nextStatus = currentStatus === 'pagado' ? 'pendiente' : 'pagado';
  try {
    const docRef = doc(raffleCollection, num);
    await updateDoc(docRef, { status: nextStatus });
  } catch (error) {
    console.error("Error al actualizar estado:", error);
    alert("No se pudo actualizar el estado.");
  }
}

async function registerPurchase() {
  const buyerInput = document.getElementById('buyerName');
  const name = buyerInput.value.trim();
  const status = document.getElementById('paymentStatus').value;

  if (!name || selectedNumbers.size === 0) return;

  const btnBuy = document.getElementById('btnBuy');
  btnBuy.disabled = true;
  btnBuy.textContent = "Guardando...";

  try {
    const batch = writeBatch(db);

    selectedNumbers.forEach(num => {
      const docRef = doc(raffleCollection, num);
      batch.set(docRef, {
        buyer: name,
        status: status,
        createdAt: new Date().toISOString()
      });
    });

    await batch.commit();

    selectedNumbers.clear();
    buyerInput.value = '';
  } catch (error) {
    console.error("Error al registrar la compra:", error);
    alert("Hubo un error al guardar.");
  } finally {
    btnBuy.textContent = "Registrar Compra";
    updateUI();
  }
}

async function releaseNumber(num) {
  if (confirm(`¿Deseas liberar el número ${num}?`)) {
    try {
      await deleteDoc(doc(raffleCollection, num));
    } catch (error) {
      console.error("Error al liberar el número:", error);
      alert("No se pudo liberar el número.");
    }
  }
}

function listenToRaffleUpdates() {
  onSnapshot(raffleCollection, (snapshot) => {
    soldNumbers = {};
    
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      soldNumbers[docSnap.id] = {
        buyer: data.buyer || "Sin nombre",
        status: data.status || "pendiente"
      };
      selectedNumbers.delete(docSnap.id);
    });

    renderGridState();
    updateUI();
  }, (error) => {
    console.error("Error en Firebase:", error);
  });
}

initGrid();
listenToRaffleUpdates();

document.getElementById('buyerName').addEventListener('input', updateUI);
document.getElementById('searchBuyer').addEventListener('input', renderTable);
document.getElementById('btnBuy').addEventListener('click', registerPurchase);

// Permitir presionar Enter en el campo de ganador
document.getElementById('winnerInput').addEventListener('keyup', (e) => {
  if (e.key === 'Enter') checkWinner();
});