/*
    SensorTag IR Temperature sensor example
    This example uses Sandeep Mistry's sensortag library for node.js to
    read data from a TI sensorTag.
    The sensortag library functions are all asynchronous and there is a
    sequence that must be followed to connect and enable sensors.
      Step 1: Connect
        1) discover the tag
        2) connect to and set up the tag
      Step 2: Activate sensors
        3) turn on the sensor you want to use (in this case, IR temp)
        4) turn on notifications for the sensor
      Step 3: Register listeners
        5) listen for changes from the sensortag
      Step 4 (optional): Configure sensor update interval
*/
//Setup sleep



//Setup MQTT

var mqtt = require('mqtt')
var fs = require('fs');

var cooldown = false;
var timer = false;
var options = {
  port:  1883,
  host: 'nyx.bjornhaug.net'
};

var client  = mqtt.connect(options)

client.on('connect', function () {

	console.log('Connected to MQTT')
})

client.on('message', function (topic, message) {
  // message is Buffer
  console.log(message.toString())
  client.end()
})

//Set up RAzberry

var zway = require('node-zway');
 
// without password 
 
// with password 
var deviceApi = new zway.DeviceApi({ host: '10.0.1.12', user: 'admin', password: 'WelcometoCX01' });


var SensorTag = require('sensortag');

var log = function(text) {
  if(text) {
    console.log(text);
  }
}

//==============================================================================
// Step 1: Connect to sensortag device.
//------------------------------------------------------------------------------
// It's address is printed on the inside of the red sleeve
// (replace the one below).
var ADDRESS = "b0:b4:48:d2:29:06";
var connected = new Promise((resolve, reject) => SensorTag.discoverByAddress(ADDRESS, (tag) => resolve(tag)))
  .then((tag) => new Promise((resolve, reject) => tag.connectAndSetup(() => resolve(tag))));

console.log(ADDRESS)
//==============================================================================
// Step 2: Enable the sensors you need.
//------------------------------------------------------------------------------
// For a list of available sensors, and other functions,
// see https://github.com/sandeepmistry/node-sensortag.
// For each sensor enable it and activate notifications.
// Remember that the tag object must be returned to be able to call then on the
// sensor and register listeners.
var sensor = connected.then(function(tag) {
  log("connected");

  tag.enableIrTemperature(log);
  tag.notifyIrTemperature(log);

  tag.enableAccelerometer(log);
  tag.notifyAccelerometer(log);

  return tag;
});

//==============================================================================
// Step 3: Register listeners on the sensor.
//------------------------------------------------------------------------------
// You can register multiple listeners per sensor.
//


// A simple example of an act on the irTemperature sensor.
sensor.then(function(tag) {
  tag.on("irTemperatureChange", function(objectTemp, ambientTemp) {
    if(objectTemp > 29) {
    	 if (!timer) {
		    console.log(objectTemp)
                    client.publish('paradise/notify/temperature', 'Close the window! It is to hot in here!');
		    setTimeout(function() { timer = false; }, 100000);
                    timer = true;
                }

	}
  })
});

// Accelerometer test
sensor.then(function(tag) {
  tag.on("accelerometerChange", function(x, y, z) {
	var xAcc = x.toFixed(1);
        var yAcc = y.toFixed(1);
        var zAcc = z.toFixed(1);
	if(Math.pow(Math.pow(yAcc,2)+Math.pow(zAcc,2),0.5)> 0.5 ) {
		
		if (!cooldown) {
			console.log("Door slammed too hard!")
			client.publish('paradise/notify/door-slam', 'Do NOT slam the door!')
			setTimeout(function() { cooldown = false; }, 10000);
			cooldown = true;
		}
	}
  });
});




//==============================================================================
// Step 4 (optional): Configure periods for sensor reads.
//------------------------------------------------------------------------------
// The registered listeners will be invoked with the specified interval.
sensor.then(function(tag) {
  tag.setIrTemperaturePeriod(3000, log);
});
