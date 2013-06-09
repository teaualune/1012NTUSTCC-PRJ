
/**
 * Module dependencies.
 */

var express = require('express'),
    routes = require('./routes'),
    master = require('./routes/master'),
    http = require('http'),
    path = require('path'),
    mpModule = require('./JsMPModule');

var app = express();

app.configure(function () {
    app.set('port', process.env.PORT || 3000);
    app.set('views', __dirname + '/views');
    app.set('view engine', 'ejs');
    app.use(express.favicon());
    app.use(express.logger('dev'));
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function () {
    app.use(express.errorHandler());
});

app.get('/', routes.index);
app.get('/master', master.master);
app.post('/master', function (req, res) {
    mpModule.start();
}, master.start);

var httpServer = http.createServer(app);

httpServer.listen(app.get('port'), function () {
    console.log("Express server listening on port " + app.get('port'));
    mpModule.setup(httpServer);
});
