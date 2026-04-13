let scanning = false;
let sessionId = "SESSAO_" + Date.now();

let db;

function updateStatus(message) {
  document.getElementById("status").innerText = message;
}

// ===== INIT DATABASE =====
function initDB() {
  let request = indexedDB.open("senseDB", 1);

  request.onupgradeneeded = function (event) {
    db = event.target.result;
    db.createObjectStore("leituras", { keyPath: "id_registro" });
  };

  request.onsuccess = function (event) {
    db = event.target.result;
    updateStatus("Banco pronto");
  };
}

// ===== SALVAR =====
function salvarLeitura(leitura) {
  let tx = db.transaction("leituras", "readwrite");
  let store = tx.objectStore("leituras");
  store.add(leitura);
}

// ===== CONTAR =====
function contarLeituras(callback) {
  let tx = db.transaction("leituras", "readonly");
  let store = tx.objectStore("leituras");

  let countRequest = store.count();

  countRequest.onsuccess = function () {
    callback(countRequest.result);
  };
}

// ===== START =====
function startScan() {
  scanning = true;
  updateStatus("Iniciando leitura...");

  capturarLeitura();
}

// ===== STOP =====
function stopScan() {
  scanning = false;

  contarLeituras((total) => {
    updateStatus("Finalizado. Total salvo: " + total);
  });
}

// ===== CAPTURA =====
function capturarLeitura() {
  if (!scanning) return;

  navigator.geolocation.getCurrentPosition(
    (position) => {
      let leitura = {
        id_registro: "ID_" + Date.now(),
        session_id: sessionId,
        beacon_id: "SIMULADO_" + Math.floor(Math.random() * 5),
        rssi: -50 - Math.floor(Math.random() * 30),
        timestamp_iso: new Date().toISOString(),
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy_m: position.coords.accuracy
      };

      salvarLeitura(leitura);

      contarLeituras((total) => {
        updateStatus("Lendo... total salvo: " + total);
      });

      setTimeout(capturarLeitura, 5000);
    },
    (error) => {
      updateStatus("Erro localização: " + error.code);
    },
    {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 0
    }
  );
}

// ===== SYNC (placeholder) =====
function syncData() {
  updateStatus("Pronto para sincronizar (próximo passo)");
}

// ===== INIT =====
initDB();
