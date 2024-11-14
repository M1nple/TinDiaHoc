// server.js
const express = require('express');
const bodyParser = require('body-parser');
const pool = require('./db');

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');


const session = require('express-session'); 

// Thiết lập session
app.use(session({
    secret: 'your-secret-key', // Khóa bí mật để mã hóa session, nên sử dụng khóa mạnh
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Để secure là false nếu không dùng HTTPS, chuyển sang true khi dùng HTTPS
}));


app.get('/login', (req, res) => {
    res.render('login', { error: null }); // Tạo file login.ejs cho form đăng nhập
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    // Kiểm tra thông tin đăng nhập
    const query = 'SELECT * FROM admin_user WHERE username = $1 AND password_hash = $2';
    const values = [username, password];

    try {
        const result = await pool.query(query, values);
        if (result.rows.length > 0) {
            req.session.isAdmin = true;
            res.redirect('/'); // Đăng nhập thành công, chuyển hướng đến trang quản trị
        } else {
            res.render('login', { error: 'Sai tên đăng nhập hoặc mật khẩu.' }); // Truyền thông báo lỗi
        }
    } catch (err) {
        res.status(500).send(err.message);
    }
});


// logout
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send('Không thể đăng xuất.');
        }
        res.redirect('/'); // Chuyển hướng về trang đăng nhập
    });
});



// Lấy danh sách ATM
app.get('/', async (req, res) => {
    try {
        // const { rows } = await pool.query("SELECT * FROM atm");

        const atmQuery = `
            SELECT a.*, b.bank_name, s.status_name
            FROM ATM a
            JOIN Bank b ON a.bank_id = b.bank_id
            JOIN atm_status s ON a.status_id = s.status_id;
        `;
        const { rows: atms } = await pool.query(atmQuery);

        res.render('admin', { atms });
    } catch (err) {
        res.status(500).send(err.message);
    }
});


const isAuthenticated = require('./middleware/auth');

//  tìm kiếm theo tên ngân hàng
app.get('/admin', isAuthenticated, (req, res) => {
    // Lấy giá trị tên ngân hàng từ query string nếu có
    const bankName = req.query.bank_name || '';  // Nếu không có thì mặc định là chuỗi rỗng
    const statusFilter = req.query.status || '';
    // Câu lệnh truy vấn để tìm ATM theo tên ngân hàng
    const query = `
        SELECT atm.*, bank.bank_name
        FROM atm
        JOIN bank ON atm.bank_id = bank.bank_id
        WHERE bank.bank_name ILIKE $1
    `;
    
    // Thực hiện truy vấn, tìm kiếm tên ngân hàng
    pool.query(query, [`%${bankName}%`], (err, result) => {
        if (err) {
            console.log(err);
            return res.status(500).send('Lỗi kết nối cơ sở dữ liệu');
        }
        // Truyền kết quả tìm kiếm vào view cùng với tên ngân hàng
        res.render('admin', { atms: result.rows, bankName: bankName });
    });
});



app.get('/admin', isAuthenticated, (req, res) => {
    const bankName = req.query.bank_name || '';
    const statusFilter = req.query.status || ''; // Lấy trạng thái lọc từ query string, nếu có

    // Lấy danh sách trạng thái từ cơ sở dữ liệu
    const statusQuery = 'SELECT * FROM atm_status'; // Đảm bảo tên bảng đúng
    pool.query(statusQuery, (err, statusResult) => {
        if (err) {
            console.error("Lỗi khi truy vấn bảng trạng thái:", err);
            return res.status(500).send("Lỗi khi truy vấn trạng thái.");
        }

        // Truy vấn danh sách ATM dựa trên tên ngân hàng và trạng thái
        const atmQuery = `
            SELECT atm.*, bank.bank_name, atm_status.status
            FROM atm
            JOIN bank ON atm.bank_id = bank.bank_id
            JOIN atm_status ON atm.status_id = atm_status.status_id
            WHERE bank.bank_name ILIKE $1
            AND ($2::int IS NULL OR atm.status_id = $2::int)
        `;
        
        pool.query(atmQuery, [`%${bankName}%`, statusFilter || null], (err, atmResult) => {
            if (err) {
                console.log(err);
                return res.status(500).send('Lỗi kết nối cơ sở dữ liệu');
            }
            
            // Truyền danh sách ATM, tên ngân hàng, trạng thái lọc và danh sách trạng thái vào view
            res.render('admin', {
                atms: atmResult.rows,
                bankName: bankName,
                statusFilter: statusFilter,
                statuses: statusResult.rows // Truyền kết quả truy vấn trạng thái vào view
            });
        });
    });
});




// ===================================================================================================


// Hiển thị form thêm ATM
app.get('/add', isAuthenticated, async (req, res) => {
    try {
        const { rows: banks } = await pool.query("SELECT * FROM bank");
        const { rows: statuses } = await pool.query("SELECT * FROM atm_status");
        res.render('add', { atm: {}, action: '/add', banks, statuses });
    } catch (err) {
        res.status(500).send(err.message);  
    }
});

// Xử lý thêm từ form thêm ATM
app.post('/add', isAuthenticated, async (req, res) => {
    const { location, latitude, longitude, bank_id, status_id,  cash_amount } = req.body;
    try {
        const query = `
            INSERT INTO ATM (atm_location, latitude, longitude, bank_id, status_id, cash_amount)
            VALUES ($1, $2, $3, $4, $5, $6)
        `;
        await pool.query(query, [location, latitude, longitude, bank_id, status_id, cash_amount]);
        res.redirect('/');  // Chuyển hướng đến trang chính (hoặc trang bạn muốn sau khi thêm)
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// ==================================================================================================

// Hiển thị form sửa ATM 
app.get('/edit/:id', isAuthenticated, async (req, res) => {
    const atmId = req.params.id;
    try {
        // Lấy thông tin cây ATM theo ID
        const atmQuery = 'SELECT * FROM ATM WHERE atm_id = $1';
        const { rows: atmRows } = await pool.query(atmQuery, [atmId]);
        const atm = atmRows[0];

        // Lấy danh sách các ngân hàng
        const bankQuery = 'SELECT * FROM Bank';
        const { rows: banks } = await pool.query(bankQuery);

        // Lấy danh sách các trạng thái
        const statusQuery = 'SELECT * FROM ATM_status';
        const { rows: statuses } = await pool.query(statusQuery);
        res.render('edit', { atm, banks, statuses });  // Truyền cả danh sách trạng thái vào form
    } catch (err) {
        res.status(500).send(err.message);
    }
});

//  xử lý form sửa ATM
app.post('/edit/:id', isAuthenticated, async (req, res) => {
    const atmId = req.params.id;
    const { location, bank_id, status_id, cash_amount } = req.body;

    try {
        const updateQuery = `
            UPDATE ATM
            SET atm_location = $1, bank_id = $2, status_id = $3, cash_amount = $4
            WHERE atm_id = $5
        `;
        await pool.query(updateQuery, [location, bank_id, status_id, cash_amount, atmId]);
        res.redirect('/'); // Quay lại trang danh sách ATM sau khi cập nhật
    } catch (err) {
        res.status(500).send(err.message);
    }
});


// Xóa ATM
app.get('/delete/:id', isAuthenticated, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query("DELETE FROM atm WHERE atm_id = $1", [id]);
        res.redirect('/');
    } catch (err) {
        res.status(500).send(err.message);
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
