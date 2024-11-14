// middleware/auth.js
function isAuthenticated(req, res, next) {
    if (req.session && req.session.isAdmin) {
        // Kiểm tra session để xác nhận người dùng đã đăng nhập và là quản trị viên
        return next();
    } else {
        // Chuyển hướng đến trang đăng nhập nếu chưa đăng nhập
        res.redirect('/login');
    }
}

module.exports = isAuthenticated;
