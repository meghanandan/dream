import React, { useEffect, useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    IconButton,
    InputAdornment,
    CircularProgress,
    Alert,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { fetchApiSetting, updateApiSetting } from 'src/store/settingApiSlice'; // Redux slice actions

const ThirdPartyDialog = ({ open, onClose }) => {
    const dispatch = useDispatch();

    const { apiSetting, loading, error } = useSelector((state) => state.settingApi); // Redux state

    const [apiKey, setApiKey] = useState('');
    const [systemUrl, setSystemUrl] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [showAPI, setShowAPI] = useState(false);

    // Toggle visibility of fields
    const handleToggleShowAPI = () => setShowAPI(!showAPI);
    const handleToggleShowKey = () => setShowKey(!showKey);

    // Enable the update button only when both fields are filled
    const isUpdateEnabled = apiKey.trim() && systemUrl.trim();

    // Fetch existing API settings when the dialog opens
    useEffect(() => {
        if (open) {
            dispatch(fetchApiSetting()); // Fetch API settings via Redux
        }
    }, [open, dispatch]);

    // Populate state with fetched API settings
    useEffect(() => {
        if (apiSetting) {
            setApiKey(apiSetting.apiKey || '');
            setSystemUrl(apiSetting.systemUrl || '');
        }
    }, [apiSetting]);

    // Handle the update logic
    const handleUpdate = async () => {
        try {
            const updatedSetting = { apiKey, systemUrl };
            await dispatch(updateApiSetting(updatedSetting)); // Dispatch Redux update action
            onClose(); // Close the dialog after a successful update
        } catch (err) {
            console.error('Error updating setting:', err);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Connect Third-Party System</DialogTitle>
            <DialogContent>
                {loading && <CircularProgress sx={{ display: 'block', margin: 'auto', mt: 2 }} />}
                {error && <Alert severity="error">{error}</Alert>}
                {!loading && (
                    <>
                        <TextField
                            label="API Key"
                            fullWidth
                            variant="outlined"
                            value={apiKey}
                            type={showAPI ? 'text' : 'password'}
                            onChange={(e) => setApiKey(e.target.value)}
                            margin="normal"
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={handleToggleShowAPI} edge="end">
                                            {showAPI ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <TextField
                            label="System URL"
                            fullWidth
                            variant="outlined"
                            value={systemUrl}
                            onChange={(e) => setSystemUrl(e.target.value)}
                            margin="normal"
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={handleToggleShowKey} edge="end">
                                            {showKey ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="secondary" disabled={loading}>
                    Cancel
                </Button>
                <Button
                    onClick={handleUpdate}
                    color="primary"
                    variant="contained"
                    disabled={!isUpdateEnabled || loading}
                >
                    {loading ? <CircularProgress size={24} /> : 'Update'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ThirdPartyDialog;
