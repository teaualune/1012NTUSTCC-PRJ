exports.master = function (req, res) {
    var host = req.headers.host;
    if (host.length < 7 || !host.match(/https?:\/\//)) {
        host = 'http://' + host;
    }
    res.render('master', {
        title: 'Master',
        socket_io_addr: host
    });
};

exports.start = function (req, res) {
    console.log('start!');
}
