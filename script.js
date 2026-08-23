// 1. Importar los módulos necesarios de Firebase desde CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  writeBatch 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 2. PEGA AQUÍ TU CONFIGURACIÓN DE FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyBZoIvHQaJj2Toye9q1O8O1y1QICpnvokg",
  authDomain: "software-rifas-de077.firebaseapp.com",
  projectId: "software-rifas-de077",
  storageBucket: "software-rifas-de077.firebasestorage.app",
  messagingSenderId: "690275251113",
  appId: "1:690275251113:web:e659eca409672e3dd2cab8"
};

// 3. Inicializar Firebase y Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const raffleCollection = collection(db, "numeros_rifa");

const TOTAL_NUMBERS = 100; // Del 00 al 99
let soldNumbers = {}; 
let selectedNumbers = new Set();

// 4. Crear la cuadrícula visual de 100 números
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

// 5. Manejar selección / deselección de números
function toggleNumber(num) {
  if (soldNumbers[num]) return; // Si ya está vendido, ignorar clic

  if (selectedNumbers.has(num)) {
    selectedNumbers.delete(num);
  } else {
    selectedNumbers.add(num);
  }

  renderGridState();
  updateUI();
}

// 6. Actualizar las clases CSS según el estado de cada número
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

// 7. Actualizar elementos de la interfaz de usuario
function updateUI() {
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

  const soldCount = Object.keys(soldNumbers).length;
  const selectedCount = selectedNumbers.size;
  const availableCount = TOTAL_NUMBERS - soldCount - selectedCount;

  document.getElementById('statAvailable').textContent = availableCount;
  document.getElementById('statSelected').textContent = selectedCount;
  document.getElementById('statSold').textContent = soldCount;

  const buyerName = document.getElementById('buyerName').value.trim();
  document.getElementById('btnBuy').disabled = !(buyerName.length > 0 && selectedNumbers.size > 0);

  renderTable();
}

// 8. Renderizar la tabla de compradores
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

// 9. Registrar compra en Firestore (Usa Batch para guardar múltiples números a la vez)
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

    // Limpiar selección local
    selectedNumbers.clear();
    buyerInput.value = '';
  } catch (error) {
    console.error("Error al registrar la compra:", error);
    alert("Hubo un error al guardar los números. Revisa la consola.");
  } finally {
    btnBuy.textContent = "Registrar Compra";
    updateUI();
  }
}

// 10. Liberar un número en Firestore
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

// 11. Escuchar cambios en tiempo real desde Firestore
function listenToRaffleUpdates() {
  onSnapshot(raffleCollection, (snapshot) => {
    soldNumbers = {};
    
    snapshot.forEach(docSnap => {
      soldNumbers[docSnap.id] = docSnap.data().buyer;
      // Si el número vendido estaba en la selección temporal de alguien, se desmarca
      selectedNumbers.delete(docSnap.id);
    });

    renderGridState();
    updateUI();
  }, (error) => {
    console.error("Error al escuchar la base de datos:", error);
  });
}

// 12. Inicialización
initGrid();
listenToRaffleUpdates();

document.getElementById('buyerName').addEventListener('input', updateUI);
document.getElementById('btnBuy').addEventListener('click', registerPurchase);