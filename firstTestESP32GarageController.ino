#include <WiFi.h>
#include <PubSubClient.h>

// 1) Wi-Fi & MQTT
const char* ssid       = "mapers";
const char* wifiPass   = "WifiPass";

const char* mqttServer = "192.0.0.2";  
const int   mqttPort   = 1883;

// 2) Pins & globals
const int reedPin        = 47;
const int gasPin         = 41;
const int tempPin        = 38;
bool      lastDoorState;
unsigned long lastSensorPublish = 0;
const unsigned long publishInterval = 5000;

WiFiClient   net;
PubSubClient client(net);

// 3) Sensor readers
float readTemperature() { return analogRead(tempPin); }
int   readGasLevel()   { return analogRead(gasPin); }

// 4) Dispatch incoming MQTT commands
void callback(char* topic, byte* payload, unsigned int len) {
  String msg;
  for (unsigned int i = 0; i < len; i++) msg += (char)payload[i];

  // **listen**
  if (String(topic) == "Garage/Door/Command") {
    Serial.printf("CMD arrived → %s\n", msg.c_str());
    if (msg == "OPEN") {
      // open actuator here
      Serial.println("  ▶ Opening door");
    }
    else if (msg == "CLOSE") {
      // close actuator here
      Serial.println("  ▶ Closing door");
    }
  }
}

// 5) Connect & subscribe
void reconnect() {
  while (!client.connected()) {
    Serial.print("Connecting to MQTT… ");
    if (client.connect("ESP32Client")) {
      Serial.println("OK");
      client.subscribe("Garage/Door/Command");
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(", retrying in 2s");
      delay(2000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  Serial.println("\n=== BOOT ===");

  // **init pins**
  pinMode(reedPin, INPUT_PULLUP);
  pinMode(gasPin,  INPUT);

  // Wi-Fi
  WiFi.begin(ssid, wifiPass);
  Serial.print("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWi-Fi connected");

  // MQTT
  client.setServer(mqttServer, mqttPort);
  client.setCallback(callback);

  // seed & publish initial state:
  lastDoorState = digitalRead(reedPin);         // INPUT_PULLUP: HIGH=open, LOW=closed
  const char* s = lastDoorState==LOW ? "CLOSED":"OPEN";
  client.publish("Garage/Door/State", s, true);
  Serial.printf("Initial Door State → %s\n", s);
  Serial.println("Setup complete");
}

void loop() {
  if (!client.connected()) reconnect();
  client.loop();

  // —— reed switch changes ——  
  // if curr is high, sensor is apart!
  bool curr = digitalRead(reedPin);
  if (curr != lastDoorState) {
    lastDoorState = curr;
    const char* state = (curr == LOW) ? "CLOSED" : "OPEN";
    client.publish("Garage/Door/State", state, true);
    Serial.printf("Door is %s\n", state);
  }

  // —— periodic temp & gas ——  
  if (millis() - lastSensorPublish > publishInterval) {
    lastSensorPublish = millis();

    // Temperature
    char tbuf[16];
    dtostrf(readTemperature(), 4, 2, tbuf);
    client.publish("Garage/Temperature", tbuf, true);

    // Gas
    char gbuf[16];
    itoa(readGasLevel(), gbuf, 10);
    client.publish("Garage/Gas", gbuf, true);

    Serial.printf("Pub  Temp:%s °C  Gas:%s\n", tbuf, gbuf);
  }
}
