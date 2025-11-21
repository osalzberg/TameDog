import React, { useState, useEffect } from 'react';
import { Container, AppBar, Toolbar, Typography, Button, Box, Paper, Grid, Card, CardContent, CircularProgress } from '@mui/material';
import axios from 'axios';

function CustomerDashboard({ user, onLogout }) {
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [bookingsRes, roomsRes] = await Promise.all([
        axios.get('/api/bookings'),
        axios.get('/api/rooms')
      ]);
      setBookings(bookingsRes.data);
      setRooms(roomsRes.data);
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
            TameDog - Customer Portal
          </Typography>
          <Typography sx={{ mr: 2 }}>Welcome, {user.firstName}</Typography>
          <Button color="inherit" onClick={onLogout}>Logout</Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom>My Bookings</Typography>
        {bookings.length === 0 ? (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography>No bookings yet. Book a room below!</Typography>
          </Paper>
        ) : (
          <Grid container spacing={2} sx={{ mb: 4 }}>
            {bookings.map(booking => (
              <Grid item xs={12} key={booking.id}>
                <Card>
                  <CardContent>
                    <Typography variant="h6">{booking.roomName}</Typography>
                    <Typography color="text.secondary">
                      {new Date(booking.checkIn).toLocaleDateString()} - {new Date(booking.checkOut).toLocaleDateString()}
                    </Typography>
                    <Typography>Status: {booking.status}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
        <Typography variant="h4" gutterBottom>Available Rooms</Typography>
        <Grid container spacing={2}>
          {rooms.map(room => (
            <Grid item xs={12} md={6} key={room.id}>
              <Card>
                <CardContent>
                  <Typography variant="h5">{room.name}</Typography>
                  <Typography color="text.secondary">Capacity: {room.capacity} dogs</Typography>
                  <Typography>${room.pricePerNight}/night</Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>{room.description}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}

export default CustomerDashboard;
