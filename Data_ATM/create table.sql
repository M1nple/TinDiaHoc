
CREATE TABLE Bank (
    bank_id SERIAL PRIMARY KEY,
    bank_name VARCHAR(255)
);
CREATE TABLE ATM_status (
    status_id SERIAL PRIMARY KEY,
    status VARCHAR(50)
);
CREATE TABLE Admin_User (
    admin_id SERIAL PRIMARY KEY,
    username VARCHAR(50),
    password_hash VARCHAR(255)
);
CREATE TABLE District(
    district_id SERIAL PRIMARY KEY,
    district_name VARCHAR(255)
);
CREATE TABLE ATM (
    atm_id SERIAL PRIMARY KEY,
    atm_location VARCHAR(255),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(10, 8),
    bank_id INT REFERENCES Bank(bank_id),
    district_id INT REFERENCES District(district_id),
    status_id INT REFERENCES ATM_status(status_id),
    cash_amount DECIMAL(18,2)
);

