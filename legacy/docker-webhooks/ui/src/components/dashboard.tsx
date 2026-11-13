import React from 'react';
import { Typography, Box, Link } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const Dashboard: React.FC = () => {
    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="body1">
                Welcome to the Docker-Webhooks UI
            </Typography>
            <Box sx={{ mt: 2 }}>
                <Box sx={{ mt: 1 }}>
                    <Link component={RouterLink} to="/logs">
                        Logs
                    </Link>
                    <Typography variant="body2">
                        Gets the latest API logs.
                    </Typography>
                </Box>
                <Box sx={{ mt: 1 }}>
                    <Link component={RouterLink} to="/images">
                        Images
                    </Link>
                    <Typography variant="body2">
                        Gets the running Docker Images.
                    </Typography>
                </Box>
                <Box sx={{ mt: 1 }}>
                    <Link component={RouterLink} to="/webhook">
                        Webhook
                    </Link>
                    <Typography variant="body2">
                        Posts a webhook to the API.
                    </Typography>
                </Box>
                <Box sx={{ mt: 1 }}>
                    <Link component={RouterLink} to="/update">
                        Update
                    </Link>
                    <Typography variant="body2">
                        Performs an update of the API image itself.
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
};

export default Dashboard;
