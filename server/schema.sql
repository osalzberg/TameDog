-- Users table
CREATE TABLE Users (
    id INT PRIMARY KEY IDENTITY(1,1),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    firstName VARCHAR(100) NOT NULL,
    lastName VARCHAR(100) NOT NULL,
    role VARCHAR(20) DEFAULT 'customer' CHECK (role IN ('admin', 'customer')),
    resetToken VARCHAR(255),
    resetTokenExpiry DATETIME,
    createdAt DATETIME DEFAULT GETDATE()
);

-- Rooms table
CREATE TABLE Rooms (
    id INT PRIMARY KEY IDENTITY(1,1),
    name VARCHAR(100) NOT NULL,
    capacity INT NOT NULL,
    pricePerNight DECIMAL(10,2) NOT NULL,
    description VARCHAR(500)
);

-- Bookings table
CREATE TABLE Bookings (
    id INT PRIMARY KEY IDENTITY(1,1),
    userId INT NOT NULL,
    roomId INT NOT NULL,
    checkIn DATE NOT NULL,
    checkOut DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
    notes VARCHAR(500),
    createdAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (roomId) REFERENCES Rooms(id) ON DELETE CASCADE
);

-- BlockedDates table
CREATE TABLE BlockedDates (
    id INT PRIMARY KEY IDENTITY(1,1),
    roomId INT,
    startDate DATE NOT NULL,
    endDate DATE NOT NULL,
    reason VARCHAR(500),
    FOREIGN KEY (roomId) REFERENCES Rooms(id) ON DELETE CASCADE
);

-- Insert sample rooms
INSERT INTO Rooms (name, capacity, pricePerNight, description) VALUES
('Cozy Suite', 1, 50.00, 'Perfect for small dogs, includes private play area'),
('Family Room', 3, 120.00, 'Spacious room for multiple dogs from the same family'),
('Luxury Suite', 1, 80.00, 'Premium accommodation with extra amenities');
