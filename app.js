let scanning = false;
let sessionId = "SESSAO_" + Date.now();
let db;

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwGiVomw6DKjUN8M1z2xQQIO5uvUn6cYi2KQfRud7JVmp8t42CEjuoUwMYXD4nFj_kYQw/exec";

function updateStatus(message) {
  document.getElementById("status").innerText = message;
}

// ===== INIT DATABASE =====
function initDB() {
  const request = indexedDB.open("senseDB", 1);

  request.onupgradeneeded = function (event) {
    db = event.target.result;

    if (!db.objectStoreNames.contains("leituras")) {
      db.createObjectStore("leituras", { keyPath: "id_registro" });
    }
  };

  request.onsuccess = function (event) {
    db = event.target.result;
    updateStatus("Banco pronto");
  };

  request.onerror = function () {
    updateStatus("Erro ao abrir banco local");
  };
}

// ===== SALVAR =====
function salvarLeitura(leitura) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("leituras", "readwrite");
    const store = tx.objectStore("leituras");
    const request = store.put(leitura);

    request.onsuccess = function () {
      resolve();
    };

    request.onerror = function () {
      reject(new Error("Erro ao salvar leitura"));
    };
  });
}

// ===== CONTAR =====
function contarLeituras(callback) {
  const tx = db.transaction("leituras", "readonly");
  const store = tx.objectStore("leituras");
  const countRequest = store.count();

  countRequest.onsuccess = function () {
    callback(countRequest.result);
  };

  countRequest.onerror = function () {
    callback(0);
  };
}

// ===== LISTAR TODAS =====
function listarLeituras() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("leituras", "readonly");
    const store = tx.objectStore("leituras");
    const request = store.getAll();

    request.onsuccess = function () {
      resolve(request.result || []);
    };

    request.onerror = function () {
      reject(new Error("Erro ao listar leituras"));
    };
  });
}

// ===== LIMPAR TODAS =====
function limparLeituras() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("leituras", "readwrite");
    const store = tx.objectStore("leituras");
    const request = store.clear();

    request.onsuccess = function () {
      resolve();
    };

    request.onerror = function () {
      reject(new Error("Erro ao limpar leituras"));
    };
  });
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
    async (position) => {
      const agora = new Date();

      const leitura = {
        id_registro: "ID_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
        session_id: sessionId,
        usuario: "TESTE_GITHUB",
        dispositivo: navigator.userAgent,
        beacon_id: "SIMULADO_" + Math.floor(Math.random() * 5),
        beacon_name: "SIMULADO",
        rssi: -50 - Math.floor(Math.random() * 30),
        timestamp_iso: agora.toISOString(),
        data_local: agora.toLocaleString("pt-BR"),
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy_m: position.coords.accuracy,
        offline_captured_at: agora.toISOString(),
        origem: "PWA_GITHUB"
      };

      try {
        await salvarLeitura(leitura);

        contarLeituras((total) => {
          updateStatus("Lendo... total salvo: " + total);
        });
      } catch (error) {
        updateStatus("Erro ao salvar leitura local");
      }

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

// ===== SYNC =====
async function syncData() {
  if (!SCRIPT_URL) {
    updateStatus("Configure a URL do Apps Script no app.js");
    return;
  }

  try {
    const leituras = await listarLeituras();

    if (!leituras.length) {
      updateStatus("Nenhuma leitura para sincronizar");
      return;
    }

    updateStatus("Sincronizando " + leituras.length + " leituras...");

    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(leituras)
    });

    const result = await response.json();

    if (result.status !== "ok") {
      throw new Error(result.message || "Falha ao sincronizar");
    }

    await limparLeituras();

    updateStatus("Sincronizado com sucesso: " + result.registros_recebidos + " leituras");
  } catch (error) {
    updateStatus("Erro na sincronização: " + error.message);
  }
}

// ===== INIT =====
initDB();
