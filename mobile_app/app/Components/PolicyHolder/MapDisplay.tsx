import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, View, Text, Platform } from "react-native";
import { WebView } from "react-native-webview";

interface MapDisplayProps {
  latitude: number;
  longitude: number;
  onLocationSelect: (lat: number, lon: number) => void;
}

const getHtmlContent = (lat: number, lon: number) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map {
      height: 100%;
      margin: 0;
      padding: 0;
      background-color: #f1f5f9;
    }
    .custom-div-icon {
      background: none;
      border: none;
    }
    .custom-pin-container {
      position: relative;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .pulsing-ring {
      position: absolute;
      bottom: -6px;
      left: 50%;
      transform: translateX(-50%);
      width: 14px;
      height: 6px;
      background-color: rgba(2, 132, 199, 0.45);
      border-radius: 50%;
      animation: pin-pulse 1.6s infinite ease-out;
      pointer-events: none;
      z-index: -1;
    }
    @keyframes pin-pulse {
      0% {
        transform: translateX(-50%) scale(0.6);
        opacity: 0.9;
        box-shadow: 0 0 0 0px rgba(2, 132, 199, 0.7);
      }
      70% {
        transform: translateX(-50%) scale(2.2);
        opacity: 0;
        box-shadow: 0 0 0 8px rgba(2, 132, 199, 0);
      }
      100% {
        transform: translateX(-50%) scale(2.2);
        opacity: 0;
        box-shadow: 0 0 0 8px rgba(2, 132, 199, 0);
      }
    }
    .pin-svg {
      filter: drop-shadow(0 4px 6px rgba(15, 23, 42, 0.25));
      animation: pin-bounce 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    @keyframes pin-bounce {
      0% {
        transform: translateY(-24px);
        opacity: 0;
      }
      70% {
        transform: translateY(2px);
      }
      100% {
        transform: translateY(0);
      }
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var initialLat = ${lat};
    var initialLon = ${lon};

    var map = L.map('map', {
      zoomControl: false,
      maxZoom: 21,
      minZoom: 7,
      maxBounds: [[5.5, 78.5], [10.5, 82.5]],
      maxBoundsViscosity: 1.0
    }).setView([initialLat, initialLon], 15);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '© OSM © CARTO',
      maxNativeZoom: 18,
      maxZoom: 21
    }).addTo(map);

    var customIcon = L.divIcon({
      html: '<div class="custom-pin-container">' +
              '<div class="pulsing-ring"></div>' +
              '<svg class="pin-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36" fill="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#0284c7"/><circle cx="12" cy="9" r="3" fill="#ffffff"/></svg>' +
            '</div>',
      className: 'custom-div-icon',
      iconSize: [36, 36],
      iconAnchor: [18, 36]
    });

    var marker = L.marker([initialLat, initialLon], {
      draggable: true,
      icon: customIcon
    }).addTo(map);

    function sendLocation(newLat, newLon) {
      var data = JSON.stringify({ latitude: newLat, longitude: newLon });
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(data);
      }
      window.parent.postMessage(data, '*');
    }

    map.on('click', function(e) {
      var newLat = e.latlng.lat;
      var newLon = e.latlng.lng;
      marker.setLatLng(e.latlng);
      map.panTo(e.latlng);
      sendLocation(newLat, newLon);
    });

    marker.on('dragend', function(e) {
      var position = marker.getLatLng();
      sendLocation(position.lat, position.lng);
    });

    window.addEventListener('message', function(e) {
      try {
        var data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (data.latitude && data.longitude) {
          var newLatLng = new L.LatLng(data.latitude, data.longitude);
          marker.setLatLng(newLatLng);
          map.panTo(newLatLng);
        }
      } catch (err) {}
    });
  </script>
</body>
</html>`;

export default function MapDisplay({ latitude, longitude, onLocationSelect }: MapDisplayProps) {
  const webViewRef = useRef<any>(null);
  
  // Capture initial coordinates on mount to prevent WebView reloads
  const initialCoords = useRef({ latitude, longitude });
  const htmlContent = useRef(getHtmlContent(initialCoords.current.latitude, initialCoords.current.longitude)).current;

  // Send message to WebView / iframe on coordinate changes
  useEffect(() => {
    const msgData = JSON.stringify({ latitude, longitude });
    if (Platform.OS === "web") {
      const iframe = document.getElementById("inline-map-iframe") as HTMLIFrameElement;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(msgData, "*");
      }
    } else {
      if (webViewRef.current) {
        webViewRef.current.postMessage(msgData);
      }
    }
  }, [latitude, longitude]);

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(
        Platform.OS === "web" ? event.data : event.nativeEvent.data
      );
      if (data.latitude && data.longitude) {
        onLocationSelect(data.latitude, data.longitude);
      }
    } catch {}
  };

  // Add postMessage event listener for Web fallback within this native file
  useEffect(() => {
    if (Platform.OS === "web") {
      window.addEventListener("message", handleMessage);
      return () => window.removeEventListener("message", handleMessage);
    }
  }, [onLocationSelect]);

  return (
    <View style={styles.container}>
      {Platform.OS === "web" ? (
        <iframe
          id="inline-map-iframe"
          srcDoc={htmlContent}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          title="Incident Map"
        />
      ) : (
        <WebView
          ref={webViewRef}
          originWhitelist={["*"]}
          source={{ html: htmlContent }}
          onMessage={handleMessage}
          style={styles.map}
          javaScriptEnabled={true}
          domStorageEnabled={true}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 220,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    marginVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  map: {
    flex: 1,
  },
});
