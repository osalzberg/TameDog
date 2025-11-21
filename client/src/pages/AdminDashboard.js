import React, { useState, useEffect } from 'react';
import { Container, AppBar, Toolbar, Typography, Button, Box, Paper, Tabs, Tab, CircularProgress } from '@mui/material';
import axios from 'axios';

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function AdminDashboard({ user, onLogout }) {
  const [tabValue, setTabValue] = useState(0);
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [bookingsRes, roomsRes, customersRes] = await Promise.all([
        axios.get('/api/bookings'),
        axios.get('/api/rooms'),
        axios.get('/api/customers')
      ]);
      setBookings(bookingsRes.data);
      setRooms(roomsRes.data);
      setCustomers(customersRes.data);
    } catch (err) {
      console.error('Failed to fetch data', err);
    }
    setLoading(false);
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            TameDog - Admin Dashboard
          </Typography>
          <Typography sx={{ mr: 2 }}>Welcome, Admin</Typography>
          <Button color="inherit" onClick={onLogout}>Logout</Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Paper>
          <Tabs value={tabValue} onChange={(e, val) => setTabValue(val)}>
            <Tab label="Bookings" />
            <Tab label="Rooms" />
            <Tab label="Customers" />
          </Tabs>
          <TabPanel value={tabValue} index={0}>
            <Typography variant="h5" gutterBottom>All Bookings ({bookings.length})</Typography>
            {bookings.map(booking => (
              <Paper key={booking.id} sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6">{booking.customerEmail} - {booking.roomName}</Typography>
                <Typography>Check-in: {new Date(booking.checkIn).toLocaleDateString()}</Typography>
                <Typography>Check-out: {new Date(booking.checkOut).toLocaleDateString()}</Typography>
                <Typography>Status: {booking.status}</Typography>
              </Paper>
            ))}
          </TabPanel>
          <TabPanel value={tabValue} index={1}>
            <Typography variant="h5" gutterBottom>Rooms ({rooms.length})</Typography>
            {rooms.map(room => (
              <Paper key={room.id} sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6">{room.name}</Typography>
                <Typography>Capacity: {room.capacity} dogs</Typography>
                <Typography>Price: ${room.pricePerNight}/night</Typography>
                <Typography>{room.description}</Typography>
              </Paper>
            ))}
          </TabPanel>
          <TabPanel value={tabValue} index={2}>
            <Typography variant="h5" gutterBottom>Customers ({customers.length})</Typography>
            {customers.map(customer => (
              <Paper key={customer.id} sx={{ p: 2, mb: 2 }}>
                <Typography variant="h6">{customer.firstName} {customer.lastName}</Typography>
                <Typography>{customer.email}</Typography>
                <Typography>Member since: {new Date(customer.createdAt).toLocaleDateString()}</Typography>
              </Paper>
            ))}
          </TabPanel>
        </Paper>
      </Container>
    </Box>
  );
}

export default AdminDashboard;
