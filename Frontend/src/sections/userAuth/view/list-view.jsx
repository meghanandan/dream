import { useTheme } from '@mui/material/styles';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { useState } from 'react';
import { TextField } from '@mui/material';
import { useNavigate } from 'react-router-dom';

// Dummy user data with roles
const dummyUsers = [
  { username: 'admin', password: 'adminPass', role: 'admin' },
  { username: 'user1', password: 'pass1', role: 'user' },
  { username: 'user2', password: 'pass2', role: 'user' },
  { username: 'user3', password: 'pass3', role: 'user' },
];

export function Login() {
  const theme = useTheme(); // Access the MUI theme if needed
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate(); // Use navigate for redirection

  const handleLogin = async (e) => {
    e.preventDefault();

    // Renamed `user` to `foundUser` to avoid conflict
    const foundUser = dummyUsers.find(
      (dummyUser) => dummyUser.username === username && dummyUser.password === password
    );

    if (foundUser) {
      // Store only username and role in local storage
      localStorage.setItem('currentUser', JSON.stringify({ username: foundUser.username, role: foundUser.role }));
      // Redirect to home or dashboard after successful login
      navigate('/home'); // Adjust this based on your route structure
    } else {
      setError('Invalid credentials, please try again.'); // Show error if login fails
    }
  };

  return (
    <div>
      <div
        style={{
          padding: theme.spacing(4),
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <Card style={{ minWidth: 300 }}>
          <CardContent>
            <Typography variant="h4" gutterBottom align="center">
              Login
            </Typography>
            {error && <Typography color="error">{error}</Typography>}
            <form onSubmit={handleLogin}>
              <TextField
                label="Username"
                variant="outlined"
                fullWidth
                margin="normal"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
              <TextField
                label="Password"
                type="password"
                variant="outlined"
                fullWidth
                margin="normal"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Button type="submit" variant="contained" color="primary" fullWidth style={{ marginTop: 10 }}>
                Login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default Login;
