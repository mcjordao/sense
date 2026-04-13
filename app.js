let scanning = false;
let currentLatitude = null;
let currentLongitude = null;
let currentAccuracy = null;

function updateStatus(message) {
  document.getElementById("status").innerText = message;
}

function startScan() {
  scanning = true;
  updateStatus("Status: iniciando leitura...");

  if (!navigator.geolocation) {
    updateStatus("Status: geolocalização não suportada neste navegador");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      currentLatitude = position.coords.latitude;
      currentLongitude = position.coords.longitude;
      currentAccuracy = position.coords.accuracy;

      updateStatus(
        "Status: localização capturada | LAT: " +
        currentLatitude +
        " | LON: " +
        currentLongitude +
        " | ACC: " +
        currentAccuracy + "m"
      );
    },
    (error) => {
      updateStatus("Status: erro ao obter localização | Código: " + error.code);
    },
    {
      enableHighAccuracy: false,
      timeout: 30000,
      maximumAge: 60000
    }
  );
}

function stopScan() {
  scanning = false;
  updateStatus("Status: finalizado");
}

function syncData() {
  updateStatus("Status: sincronização ainda não implementada");
}