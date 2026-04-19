#include <WiFi.h>
#include <WebServer.h>
#include <TinyGPS++.h>
#include <HardwareSerial.h>
#include <DHT.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// ----------------------------------------------------------------------------
// CONFIGURATION
// ----------------------------------------------------------------------------

// ESP32 creates its own WiFi hotspot (Access Point mode)
// Your laptop connects to this network — no router/internet needed!
const char* AP_SSID = "SERA_TAG_001";       // Name of the hotspot
const char* AP_PASS = "sera1234";           // Password (min 8 characters)

const String DEVICE_ID = "ESP32_TAG_001";

// ----------------------------------------------------------------------------
// PINS
// ----------------------------------------------------------------------------
const int SOS_BTN_PIN = 5;      // SOS switch button
const int BUZZER_PIN = 15;      // Buzzer
const int DHTPIN = 4;           // DHT sensor data pin
const int RXPin = 16;           // GPS TX connects to ESP RX (16)
const int TXPin = 17;           // GPS RX connects to ESP TX (17)

#define DHTTYPE DHT11           // Change to DHT22 if using DHT22

// ----------------------------------------------------------------------------
// OBJECTS & GLOBALS
// ----------------------------------------------------------------------------
TinyGPSPlus gps;
HardwareSerial gpsSerial(2);

DHT dht(DHTPIN, DHTTYPE);

// LCD (I2C address 0x27 or 0x3F)
LiquidCrystal_I2C lcd(0x27, 16, 2);

// Built-in web server on port 80
WebServer server(80);

// Sensor data (updated every 2 seconds)
float currentTemp = 0.0;
double currentLat = 0.0;
double currentLon = 0.0;
bool sosActive = false;
unsigned long sosTriggerTime = 0;

// Buzzer
const unsigned long BUZZER_DURATION = 5000;
bool buzzerOn = false;
unsigned long buzzerStartTime = 0;

// Timing
unsigned long lastReadTime = 0;
const unsigned long READ_INTERVAL = 2000;

// Buzzer trigger from backend
bool externalBuzzer = false;

// ----------------------------------------------------------------------------
// SETUP
// ----------------------------------------------------------------------------
void setup() {
  Serial.begin(115200);

  // Setup LCD — permanent display
  Wire.begin(21, 22);
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("   SERA TAG");
  lcd.setCursor(0, 1);
  lcd.print("  by spectra");

  // Setup Pins
  pinMode(SOS_BTN_PIN, INPUT_PULLUP);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);

  // Setup Sensors
  dht.begin();
  gpsSerial.begin(9600, SERIAL_8N1, RXPin, TXPin);

  // -------------------------------------------------------
  // Start ESP32 as a WiFi Hotspot (Access Point)
  // -------------------------------------------------------
  WiFi.mode(WIFI_AP);
  WiFi.softAP(AP_SSID, AP_PASS);

  Serial.println("===========================================");
  Serial.println("  SERA TAG — Offline Hotspot Mode");
  Serial.println("===========================================");
  Serial.print("  Hotspot Name : ");
  Serial.println(AP_SSID);
  Serial.print("  Password     : ");
  Serial.println(AP_PASS);
  Serial.print("  ESP32 IP     : ");
  Serial.println(WiFi.softAPIP());
  Serial.println("===========================================");
  Serial.println("  Connect your laptop to this WiFi,");
  Serial.println("  then access: http://192.168.4.1/data");
  Serial.println("===========================================");

  // -------------------------------------------------------
  // Setup Web Server Endpoints
  // -------------------------------------------------------

  // GET /data — Returns current sensor data as JSON
  server.on("/data", HTTP_GET, handleGetData);

  // POST /buzzer — Backend can trigger the buzzer
  server.on("/buzzer", HTTP_POST, handleBuzzerTrigger);

  // GET / — Simple info page
  server.on("/", HTTP_GET, []() {
    server.send(200, "text/html",
      "<html><body style='font-family:sans-serif;text-align:center;padding:40px'>"
      "<h1>SERA TAG</h1>"
      "<h3>by spectra</h3>"
      "<p>Device: " + DEVICE_ID + "</p>"
      "<p><a href='/data'>View Live Sensor Data (JSON)</a></p>"
      "</body></html>");
  });

  // Handle CORS for browser requests
  server.enableCORS(true);

  server.begin();
  Serial.println("Web server started on port 80");
}

// ----------------------------------------------------------------------------
// LOOP
// ----------------------------------------------------------------------------
void loop() {
  // Handle incoming HTTP requests
  server.handleClient();

  // Feed GPS data
  while (gpsSerial.available() > 0) {
    gps.encode(gpsSerial.read());
  }

  // Handle SOS Button (Active LOW — switch pulls to GND)
  if (digitalRead(SOS_BTN_PIN) == LOW && !sosActive) {
    sosActive = true;
    sosTriggerTime = millis();
    triggerBuzzer();
    Serial.println("SOS BUTTON PRESSED!");
  }

  // Reset SOS flag after 10 seconds to allow re-triggering
  if (sosActive && millis() - sosTriggerTime > 10000) {
    sosActive = false;
  }

  // Handle buzzer timer
  if (buzzerOn && millis() - buzzerStartTime > BUZZER_DURATION) {
    buzzerOn = false;
    digitalWrite(BUZZER_PIN, LOW);
    // resetLCD(); // Reset the message back to default
  }

  // Read sensors every 2 seconds
  if (millis() - lastReadTime > READ_INTERVAL) {
    lastReadTime = millis();
    readSensors();
  }
}

// ----------------------------------------------------------------------------
// SENSOR READING
// ----------------------------------------------------------------------------
void readSensors() {
  // Read temperature
  float t = dht.readTemperature();
  if (!isnan(t)) {
    currentTemp = t;
  } else {
    Serial.println("DHT read failed");
  }

  // Read GPS
  if (gps.location.isValid()) {
    currentLat = gps.location.lat();
    currentLon = gps.location.lng();
  } else {
    // Hardcoded SERA Tag location (Pune)
    currentLat = 18.464140;
    currentLon = 73.867642;
  }

  // Print to Serial Monitor for debugging
  Serial.print("Temp: ");
  Serial.print(currentTemp);
  Serial.print("°C | GPS: ");
  Serial.print(currentLat, 6);
  Serial.print(", ");
  Serial.print(currentLon, 6);
  Serial.print(" | SOS: ");
  Serial.println(sosActive ? "YES" : "NO");
}

// ----------------------------------------------------------------------------
// WEB SERVER HANDLERS
// ----------------------------------------------------------------------------

// GET /data — Returns all sensor data as JSON
void handleGetData() {
  StaticJsonDocument<256> doc;
  doc["device_id"] = DEVICE_ID;
  doc["lat"] = currentLat;
  doc["lon"] = currentLon;
  doc["temperature"] = currentTemp;
  doc["sos"] = sosActive;
  doc["timestamp"] = millis();

  String json;
  serializeJson(doc, json);

  server.send(200, "application/json", json);
}

// POST /buzzer — Backend triggers the physical buzzer
void handleBuzzerTrigger() {
  triggerBuzzer();
  Serial.println("BUZZER triggered by backend (danger zone!)");
  server.send(200, "application/json", "{\"success\":true}");
}

// ----------------------------------------------------------------------------
// BUZZER & LCD ALERTS
// ----------------------------------------------------------------------------
// void triggerBuzzer() {
//   buzzerOn = true;
//   buzzerStartTime = millis();
//   digitalWrite(BUZZER_PIN, HIGH);
  
//   // Show message on LCD
//   lcd.clear();
//   lcd.setCursor(0, 0);
//   lcd.print("! SOS DANGER !");
//   lcd.setCursor(0, 1);
//   lcd.print(" EVACUATE NOW ");
// }

// void resetLCD() {
//   lcd.clear();
//   lcd.setCursor(0, 0);
//   lcd.print("   SERA TAG");
//   lcd.setCursor(0, 1);
//   lcd.print("  by spectra");
// }
