import React, { useState } from 'react';
import axios from 'axios';
import {
    Box,
    Button,
    Container,
    Typography,
    Alert,
    CircularProgress,
} from '@mui/material';
import { toast } from 'react-toastify';

const Update: React.FC = () => {
    const [responseData, setResponseData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const onSubmit = async () => {
        try {
            setLoading(true);

            const token = localStorage.getItem('token');
            const response = await axios.post('http://localhost:4000/update', {}, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            toast.success('Update Request Sent...');
            
            setResponseData(response.data);
            setLoading(false);
        } catch (error) {
            toast.error('Update Request Failed...');
            
            setResponseData({ error: 'Failed to Send Update' });
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="sm">
            <Button
                onClick={onSubmit}
                variant="contained"
                color="primary"
                sx={{ mt: 2 }}
                fullWidth
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : null}
            >
                {loading ? 'Updating...' : 'Update'}
            </Button>

            {responseData && (
                <Box mt={4}>
                    <Typography variant="h6" gutterBottom>
                        Server Response
                    </Typography>
                    <Alert severity={responseData.error ? 'error' : 'success'} sx={{ whiteSpace: 'pre-wrap' }}>
                        <pre>{JSON.stringify(responseData, null, 2)}</pre>
                    </Alert>
                </Box>
            )}
        </Container>
    );
};

export default Update;