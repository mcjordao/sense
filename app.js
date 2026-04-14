let scanning = false;
let sessionId = "SESSAO_" + Date.now();
let sessionLabel = gerarSessionLabel();
let db;

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwGiVomw6DKjUN8M1z2xQQIO5uvUn6cYi2KQfRud7JVmp8t42CEjuoUwMYXD4nFj_kYQw/exec";

const btnStart = () => document.getElementById("btnStart");
const btnStop = () => document.getElementById("btnStop");
const btnSync = () => document.getElementById("btnSync");

function gerarSessionLabel() {
  const agora = new Date();

  return agora.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function updateStatus(message) {
  document.getElementById("status").innerText = message;
}

function setActiveButton(activeButton) {
  btnStart().classList.remove("btn-active");
  btnStop().classList.remove("btn-active");
  btnSync().classList.remove("btn-active");

  if (activeButton === "start") btnStart().classList.add("btn-active");
  if (activeButton === "stop") btnStop().classList.add("btn-active");
  if (activeButton === "sync") btnSync().classList.add("btn-active");
}

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

function startScan() {
  if (!db) {
    updateStatus("Banco ainda não está pronto");
    return;
  }

  if (scanning) {
    updateStatus("Leitura já está em andamento");
    return;
  }

  scanning = true;
  sessionId = "SESSAO_" + Date.now();
  sessionLabel = gerarSessionLabel();

  setActiveButton("start");
  updateStatus("Lendo...");
  capturarLeitura();
}

function stopScan() {
  scanning = false;
  setActiveButton("stop");

  contarLeituras((total) => {
    updateStatus("Leitura finalizada. Total salvo: " + total);
  });
}

function capturarLeitura() {
  if (!scanning) {
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const agora = new Date();

      const leitura = {
        id_registro: "ID_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
        session_id: sessionId,
        session_label: sessionLabel,
        usuario: "TESTE_GITHUB",
        dispositivo: navigator.userAgent,
        beacon_id: "SIMULADO_" + Math.floor(Math.random() * 5),
        beacon_name: "SIMULADO",
        rssi: -50 - Math.floor(Math.random() * 30),
        timestamp_iso: agora.toISOString(),
        data_local: agora.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy_m: position.coords.accuracy,
        offline_captured_at: agora.toISOString(),
        origem: "PWA_GITHUB"
      };

      try {
        await salvarLeitura(leitura);

        contarLeituras((total) => {
          if (scanning) {
            updateStatus("Lendo... " + total + " leitura(s) salva(s)");
          }
        });
      } catch {
        updateStatus("Erro ao salvar leitura local");
      }

      setTimeout(capturarLeitura, 5000);
    },
    (error) => {
      updateStatus("Erro localização: " + error.code);
      setTimeout(capturarLeitura, 5000);
    },
    {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 0
    }
  );
}

async function syncData() {
  setActiveButton("sync");

  if (!SCRIPT_URL || SCRIPT_URL === "COLE_AQUI_SUA_URL_DO_APPS_SCRIPT") {
    updateStatus("Configure a URL do Apps Script no app.js");
    return;
  }

  if (!db) {
    updateStatus("Banco ainda não está pronto");
    return;
  }

  try {
    const leituras = await listarLeituras();

    if (!leituras.length) {
      updateStatus("Nenhuma leitura para sincronizar");
      return;
    }

    updateStatus("Sincronizando " + leituras.length + " leitura(s)...");

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

    updateStatus("Sincronizado com sucesso: " + result.registros_recebidos + " leitura(s)");
  } catch (error) {
    updateStatus("Erro na sincronização: " + error.message);
  }
}

initDB();
