
/*
 * GET home page.
 */

exports.index = function(req, res){
  res.render('index', {
    title: 'Express',
    socket_io_addr: 'http://140.112.90.46:3000'
  });
};
