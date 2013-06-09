
/*
 * GET home page.
 */

exports.index = function (req, res) {
    var host = req.headers.host;
    if (host.length < 7 || !host.match(/https?:\/\//)) {
        host = 'http://' + host;
    }
    res.render('index', {
        title: 'Express',
        socket_io_addr: host
    });
};
