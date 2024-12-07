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
            res.redirect('/admin'); // Đăng nhập thành công, chuyển hướng đến trang quản trị
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



const isAuthenticated = require('./middleware/auth');


// Lấy danh sách ATM
app.get('/admin', async (req, res) => {
    try {
        // const { rows } = await pool.query("SELECT * FROM atm");

        const atmQuery = `
            SELECT a.*, b.bank_name, s.status_name, d.district_name
            FROM atm a
            JOIN bank b ON a.bank_id = b.bank_id
            JOIN atm_status s ON a.status_id = s.status_id
            LEFT JOIN district d ON a.district_id = d.district_id;
        `;
const { rows: atms } = await pool.query(atmQuery);

        res.render('admin', { atms });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.get('/search', async (req, res) => {
    const searchTerm = req.query.search || ''; // Lấy giá trị tìm kiếm từ query string

    const query = `
        SELECT atm.*, bank.bank_name, district.district_name, status.status_name
        FROM atm
        JOIN bank ON atm.bank_id = bank.bank_id
        JOIN district ON atm.district_id = district.district_id
        JOIN atm_status status ON atm.status_id = status.status_id
        WHERE bank.bank_name ILIKE $1 OR district.district_name ILIKE $1
    `;

    try {
        const { rows: atms } = await pool.query(query, [`%${searchTerm}%`]);
        res.render('user', { atms, searchTerm }); // Render trang user kèm kết quả
    } catch (err) {
        console.error(err);
        res.status(500).send('Lỗi kết nối cơ sở dữ liệu');
    }
});

// Hiển thị form thêm ATM
app.get('/add', isAuthenticated, async (req, res) => {
    try {
        const { rows: banks } = await pool.query("SELECT * FROM bank");
        const { rows: statuses } = await pool.query("SELECT * FROM atm_status");
        const {rows: districts } = await pool.query("SELECT * FROM district");
        res.render('add', { atm: {}, action: '/add', banks, statuses, districts });
    } catch (err) {
        res.status(500).send(err.message);  
    }
});

// Xử lý thêm từ form thêm ATM
app.post('/add', isAuthenticated, async (req, res) => {
    const latitude = parseFloat(req.body.latitude);
    const longitude = parseFloat(req.body.longitude);
    const { location,district_id, bank_id, status_id,  cash_amount } = req.body;
    try {
        const query = `
            INSERT INTO ATM (atm_location, latitude, longitude, district_id, bank_id, status_id, cash_amount)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;
        await pool.query(query, [location, latitude, longitude, district_id, bank_id, status_id, cash_amount]);
        res.redirect('/admin');  // Chuyển hướng đến trang chính (hoặc trang bạn muốn sau khi thêm)
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

        const districtQuery = 'SELECT * FROM district';
        const { rows: districts } = await pool.query(districtQuery);

        res.render('edit', { atm, banks, statuses, districts });  // Truyền cả danh sách trạng thái vào form
    } catch (err) {
        res.status(500).send(err.message);
    }
});

//  xử lý form sửa ATM
app.post('/edit/:id', isAuthenticated, async (req, res) => {
    const atmId = req.params.id;
    const { location, district_id, bank_id, status_id, cash_amount } = req.body;

    try {
        const updateQuery = `
            UPDATE ATM
            SET atm_location = $1, district_id = $2, bank_id = $3, status_id = $4, cash_amount = $5
            WHERE atm_id = $6
        `;
        await pool.query(updateQuery, [location, district_id,bank_id, status_id, cash_amount, atmId]);
        res.redirect('/admin'); // Quay lại trang danh sách ATM sau khi cập nhật
    } catch (err) {
        res.status(500).send(err.message);
    }
});


// Xóa ATM
app.get('/delete/:id', isAuthenticated, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query("DELETE FROM atm WHERE atm_id = $1", [id]);
        res.redirect('/admin');
    } catch (err) {
        res.status(500).send(err.message);
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});


app.get('/', (req, res) => {
    // Lấy danh sách các ATM từ database
    const atmQuery = `
        SELECT atm.*, bank.bank_name, atm_status.status_name, district.district_name
        FROM atm 
        JOIN bank ON atm.bank_id = bank.bank_id
        JOIN atm_status ON atm.status_id = atm_status.status_id
        JOIN district ON atm.district_id = district.district_id;
    `;
    
    pool.query(atmQuery, (err, atmResult) => {
        if (err) {
            console.error("Lỗi khi truy vấn cây ATM:", err);
            return res.status(500).send("Lỗi khi truy vấn dữ liệu ATM.");
        }

        // Debug: Ghi log danh sách các ATM lấy từ database
        // console.log(atmResult.rows);

        // Truyền danh sách ATM vào view
        res.render('user', {
            atms: atmResult.rows,
        });
    });
});


