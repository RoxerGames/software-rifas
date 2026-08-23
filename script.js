import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  doc, 
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

// Inicialización de Firebase
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
      box.classList.add('sold');
      box.title = `Vendido a: ${soldNumbers[num]}`;
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

  // 2. Cálculo de disponibles
  const availableList = [];
  for (let i = 0; i < TOTAL_NUMBERS; i++) {
    const numStr = i.toString().padStart(2, '0');
    if (!soldNumbers[numStr]) {
      availableList.push(numStr);
    }
  }

  // 3. Contadores
  const soldCount = Object.keys(soldNumbers).length;
  const selectedCount = selectedNumbers.size;
  const availableCount = availableList.length - selectedCount;

  document.getElementById('statAvailable').textContent = availableCount;
  document.getElementById('statSelected').textContent = selectedCount;
  document.getElementById('statSold').textContent = soldCount;

  // 4. Estado de botón
  const buyerName = document.getElementById('buyerName').value.trim();
  document.getElementById('btnBuy').disabled = !(buyerName.length > 0 && selectedNumbers.size > 0);

  // 5. Generar texto de números disponibles
  updateAvailableText(availableList);

  // 6. Tabla
  renderTable();
}

function updateAvailableText(availableList) {
  const textArea = document.getElementById('availableText');
  if (availableList.length === 0) {
    textArea.value = "🎟️ ¡TODOS LOS NÚMEROS HAN SIDO VENDIDOS! 🎉";
    return;
  }

  const listFormatted = availableList.join(' - ');
  const message = `🎟️ *NÚMEROS DISPONIBLES DE LA RIFA* (${availableList.length} disponibles):\n\n${listFormatted}\n\n¡Elige el tuyo antes de que se agoten! ✨`;
  
  textArea.value = message;
}

// Función global para copiar al portapapeles
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
    alert("No se pudo copiar automáticamente. Por favor selecciónalo y cópialo manualmente.");
  });
};

function renderTable() {
  const tbody = document.getElementById('soldTableBody');
  tbody.innerHTML = '';

  const sortedKeys = Object.keys(soldNumbers).sort();

  sortedKeys.forEach(num => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight: bold; color: var(--sold);">${num}</td>
      <td>${soldNumbers[num]}</td>
      <td><button class="delete-btn" data-num="${num}">Liberar</button></td>
    `;

    tr.querySelector('.delete-btn').addEventListener('click', () => releaseNumber(num));
    tbody.appendChild(tr);
  });
}

async function registerPurchase() {
  const buyerInput = document.getElementById('buyerName');
  const name = buyerInput.value.trim();

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
      soldNumbers[docSnap.id] = docSnap.data().buyer;
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
document.getElementById('btnBuy').addEventListener('click', registerPurchase);