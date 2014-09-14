var express = require("express"),
    app = express(),
    expressHandlebars = require("express-handlebars"),
    request = require("superagent"),
    NRP = require("node-redis-pubsub-fork"),
    pubsubChannel = new NRP({ scope: "messages" });

// Queries discovery for wrapperapi port number
var wrapperPort;
pubsubChannel.on("discovery:serviceInfo", function(data) {
    if (data.serviceInfo[0].status == "running" && data.serviceName == "sea-microservices/microservices-wrapperapi"){
        wrapperPort = data.serviceInfo[0].port;
    }
});
pubsubChannel.emit("discovery:getInfo", {name: "sea-microservices/microservices-wrapperapi"});

app.engine("hbs", expressHandlebars({
    extname: "hbs",
    defaultLayout: "main.hbs",
    helpers: {ifCond: function(v1, v2, options) {
                    if(v1 === v2) {
                        return options.fn(this);
                    }
                    return options.inverse(this);
                }
    }
}));
app.set("view engine", "hbs");

app.use("/bootstrap", express.static(__dirname + "/node_modules/bootstrap/dist"));
app.use("/resources", express.static(__dirname + "/resources"));

app.get("/", function(req, res){
    var reqInner = request.get("http://localhost:" + wrapperPort + "/discovery/getInfo");
    reqInner.end(function(data) {
        var services = data.body.services;
        res.render('index', {services: services, wrapperPort: wrapperPort});
    });
});

app.get("/logs/:service", function(req, res) {
    var reqInner = request.put("http://localhost:" + wrapperPort + "/logging/query");
    var serviceName = req.param("service");
    reqInner.send({service: serviceName});
    reqInner.end(function(data) {
        for (var i = 0; i < data.body.length; i++) {
            var logInfo = "";
            for (x in data.body[i]) {
                if (x != "channel" && x != "timeStamp" && x != "_id") {
                    logInfo += x + ": " + data.body[i][x] + ", ";
                }
            }
            logInfo = logInfo.substring(0, logInfo.length - 2);
            data.body[i].stringedInfo = logInfo;
        }
        res.render('logs', {log: data.body, wrapperPort: wrapperPort, serviceName: serviceName}); 
    });
});

app.get("/logs/:service/:channel", function(req, res) {
    var reqInner = request.put("http://localhost:" + wrapperPort + "/logging/query");
    var serviceName = req.param("service");
    var channel = req.param("channel");
    reqInner.send({service: serviceName, channel: channel});
    reqInner.end(function(data) {
        for (var i = 0; i < data.body.length; i++) {
            var logInfo = "";
            for (x in data.body[i]) {
                if (x != "channel" && x != "timeStamp" && x != "_id") {
                    logInfo += x + ": " + data.body[i][x] + ", ";
                }
            }
            logInfo = logInfo.substring(0, logInfo.length - 2);
            data.body[i].stringedInfo = logInfo;
        }
        res.render('logs', {log: data.body, wrapperPort: wrapperPort, serviceName: serviceName}); 
    });
});

app.listen(8080);
