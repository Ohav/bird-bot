var express = require('express');
var app = express();
var router = express.Router();
var bodyParser = require('body-parser');
var mongoConn = require('mongodb');
var assert = require('assert');

var path = require('path');

app.use(bodyParser.json());

app.use(bodyParser.urlencoded({
    extended: true
}));

var assert = require('assert');
var url = 'mongodb://birdBot:thebird@ds151049.mlab.com:51049/heroku_h28447j7';

app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname + '/index.html'));
});

app.get('/reports', function(req, res) {
    console.log('Request to pull reports');
    mongoConn.connect(url, function(err, db) {
        console.log('log into mongo');
        // assert.equal(null, err);
        var reports = db.collection('reports').find({}).toArray()

        reports.then(function (fulfilled) {
            res.send(fulfilled);
        })
    })
})

app.post('/reports', function(req, res) {
    console.log(req.body);
    var unixTime = new Date().getTime();
    var newReport = {
        reporterName: req.body.reporterName,
        location: {lan: req.body.latitude ,long: req.body.longitude },
        birdType : req.body.birdType,
        amount : req.body.amount,
        height : req.body.height,
        flockId : req.body.flockId ,
        areaName : req.body.areaName ,
        credibility : req.body.credibility,
        image: req.body.image,
        time : unixTime
    }

    for(var field in newReport)
        if(newReport[field] == null || newReport[field] == undefined)
            newReport[field] = '';
    if(newReport['location']['lan'] != null && newReport['location']['long'] != null && newReport['reporterName'] != null) {
        mongoConn.connect(url, function (err, db) {
            //assert(null,err);
            var result = db.collection('reports').insertOne(newReport, function (erro, req) {
                console.log('Item inserted');
                db.close();
            })
        })
    }
    res.send(JSON.stringify(newReport));
});

var port = process.env.PORT || 80;

app.listen(port, function() {
    console.log("connection started")
});

module.exports = router;

// Console will print the message
console.log('Server running at http://127.0.0.1:' + port);
