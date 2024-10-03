// chạy các lệnh dưới trong terminal để tạo package trong project
// npm i express
// npm i ejs
// npm i pg
// npm i
// tạo folder views
const express = require("express");
const app = express();
const port = 3000;
app.set("view engine", "ejs");
app.set("views", "./views") // folder views 

//Khai báo thông số kết nối postgre

// Định nghĩa route để lấy và hiện dữ liệu

app.listen(port, () =>{
  console.log(`Ung dung dang chay voi port ${port}`);
});



//Khai báo thông số kết nối postgre
const { Client } = require('pg');
var pg = new Client({
  user: 'postgres',
  password: '652003',
  host: 'localhost',
  port: '5432',
  database: 'Data_05',
});



// Tạo  route để lấy và hiện dữ liệu
app.get("/", async (reg, res)=> {
  await pg.connect()
  .catch( err => console.error('Lỗi kết nối đến PostgreSQL', err))
  .then(() => console.log('Connected to PostgreSQL database'));

  let sql = "select name from benh_vien"; // select cột muốn lấy from từ database
  let data = await pg.query(sql);
  console.log(data.rows)
  res.render("map", { map_data:data.rows }) // map  = map.ejs trong views map_data tự tạo
})