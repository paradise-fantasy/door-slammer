require('dotenv').config();

var mqtt = require('mqtt')
var fs = require('fs');
var SensorTag = require('sensortag');

const SENSOR_NAME = 'Door';

const TEMPERATURE_MEASUREMENT_COOLDOWN = 3000; // Every 3 seconds
const TEMPERATURE_UPPER_THRESHOLD = 25;
const TEMPERATURE_LOWER_THRESHOLD = 16;
const TOO_HOT_COOLDOOWN = 30000; // 30 sec cooldown
const TOO_HOT_STRING = 'Open the window! It is to hot, hot, hot in here, so take of all your clothes!';
const TOO_COLD_COOLDOOWN = 30000; // 30 sec cooldown
const TOO_COLD_STRING = 'Brr! Its cold in here. There must be som Toros in the atmosphere!'

const DO_NOT_SLAM_COOLDOWN = 10000;
const DO_NOT_SLAM_STRING = 'Do NOT slam the door!';

const publish = (topic, object, noJSON) => {
  if (!connected) return console.log('Not connected to MQTT yet');
  client.publish(topic, noJSON ? object : JSON.stringify(object));
}

/**
 * TEMPERATURE MEASUREMENTS
 */
let lastTempMeasurement = Date.now();
let lastHotMessage = Date.now();
let lastColdMessage = Date.now();
const handleTemperatureChange = (objectTemp, ambientTemp) => {
  const now = Date.now();
  if (now - lastTempMeasurement > TEMPERATURE_MEASUREMENT_COOLDOWN) {
    publish('paradise/api/temperature', { sensor: SENSOR_NAME, temperature: ambientTemp });
    publish('paradise/log/temperature', { sensor: SENSOR_NAME, objectTemp: objectTemp, ambientTemp: ambientTemp });
    lastTempChange = now;
  }

  if (now - lastHotMessage > TOO_HOT_COOLDOOWN && ambientTemp > TEMPERATURE_UPPER_THRESHOLD) {
    publish('paradise/notify/tts', TOO_HOT_STRING, true);
    lastHotMessage = now;
  }

  else if (now - lastColdMessage > TOO_COLD_COOLDOOWN && ambientTemp < TEMPERATURE_LOWER_THRESHOLD) {
    publish('paradise/notify/tts', TOO_COLD_STRING, true);
    lastColdMessage = now;
  }
}

/**
 * DOOR SLAMMING MEASUREMENTS
 */
let lastSlamMessage = Date.now();
const handleAccelerometerChange = (x, y, z) => {
  const now = Date.now();
  if (now - lastSlamMessage > DO_NOT_SLAM_COOLDOWN) {
    var xAcc = x.toFixed(1);
    var yAcc = y.toFixed(1);
    var zAcc = z.toFixed(1);
    if(Math.pow(Math.pow(yAcc,2)+Math.pow(zAcc,2),0.5) > 0.75) {
      publish('paradise/notify/tts', DO_NOT_SLAM_STRING);
    }
  }
}

// Setup MQTT
const client = mqtt.connect(process.env.MQTT_HOST, {
  cert: fs.readFileSync('ca.crt'),
  rejectUnauthorized: false
});

let connected = false;
client.on('connect', function () {
	console.log('Connected to MQTT');
  connected = true;
});

// Setup SensorTag
var ADDRESS = "BC:6A:29:26:8C:B1";
SensorTag.discoverByAddress(ADDRESS, (tag) => {
  console.log('Discovered SensorTag');
  tag.connectAndSetup(() => {
    console.log('SensorTag connected and set up');

    tag.enableIrTemperature();
    tag.setIrTemperaturePeriod(300);
    tag.notifyIrTemperature();

    tag.enableAccelerometer();
    tag.notifyAccelerometer();

    tag.on('irTemperatureChange', handleTemperatureChange);
    tag.on('accelerometerChange', handleAccelerometerChange);
  });
});
