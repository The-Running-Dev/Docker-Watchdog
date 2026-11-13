// src/components/webhook.tsx

import React, { useState, useEffect, useRef } from 'react';
import {
    Box,
    Button,
    Checkbox,
    Container,
    FormControl,
    FormControlLabel,
    InputLabel,
    MenuItem,
    Select,
    TextField,
    Typography,
    Alert,
    CircularProgress,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { WebhookSchema, WebhookFormData } from '../models';
import { Containers, WebhookResponse } from '../../../shared/models/index';
import apiService from '../services/api.service.ts';

const FORM_STORAGE_KEY = 'post-webhook-form';

const defaultValues: WebhookFormData = {
    event: 'update-container',
    data: {
        projectOrContainerId: '',
        hardReset: false,
        isTest: true
    }
};

const Webhook: React.FC<{ onAfterPost?: () => void }> = ({ onAfterPost }) => {
    const [responseData, setResponseData] = useState<WebhookResponse>({} as WebhookResponse);
    const [containers, setContainers] = useState<Containers[]>([]);
    const [loading, setLoading] = useState(false);

    const {
        register,
        handleSubmit,
        control,
        reset,
        watch,
        formState: { errors },
    } = useForm<WebhookFormData>({
        resolver: zodResolver(WebhookSchema),
        defaultValues,
    });

    // Load saved values from localStorage
    useEffect(() => {
        const saved = localStorage.getItem(FORM_STORAGE_KEY);
        
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                
                reset(parsed);
            } catch {
                console.warn('Invalid LocalStorage Data');
            }
        }
    }, [reset]);

    // Watch and save form changes to localStorage
    useEffect(() => {
        const subscription = watch((value) => {
            localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(value));
        });
        
        return () => subscription.unsubscribe();
    }, [watch]);

    const fetchedRef = useRef(false); // Prevent double-fetch in dev
    
    // Fetch containers
    useEffect(() => {
        if (fetchedRef.current) {
            return;
        }

        fetchedRef.current = true;

        const fetchContainers = async () => {
            try {
                const containers = await apiService.getContainers();
                //const containers = c.map(container => container);

                setContainers(containers);
            } catch (err) {
                console.error('Failed to Fetch Containers:', err);
            }
        };

        fetchContainers();
    }, []);

    const onSubmit = async (data: WebhookFormData) => {
        try {
            setLoading(true);
            
            const response = await apiService.post<WebhookResponse>('http://localhost:4000/webhook', data);

            setResponseData(response);
            setLoading(false);
            
            // Reset the form to default values
            reset(defaultValues);

            // Optionally trigger external effect (e.g. refresh logs)
            onAfterPost?.();
        } catch (error) {
            console.error('Webhook Post Error:', error);
            
            setResponseData({ success: false, message: 'Failed to Send Webhook' } as WebhookResponse);
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="sm">
            <form onSubmit={handleSubmit(onSubmit)}>
                <TextField
                    label="Event"
                    fullWidth
                    margin="normal"
                    {...register('event')}
                    error={!!errors.event}
                    helperText={errors.event?.message}
                    InputProps={{ readOnly: true }}
                />
                <FormControl fullWidth margin="normal">
                    <InputLabel id="image-label">Container</InputLabel>
                    <Controller
                        name="data.projectOrContainerId"
                        control={control}
                        render={({ field }) => (
                            <Select
                                labelId="image-label"
                                label="Image"
                                {...field}
                                error={!!errors.data?.projectOrContainerId}
                            >
                                {containers.map((project, index) => (
                                    project.Project ? (
                                        <MenuItem key={index} value={project.Project}>
                                            {project.Project}
                                        </MenuItem>
                                    ) : (
                                        project.Containers.map((container, idx) => (
                                            <MenuItem key={`${index}-${idx}`} value={container.Name}>
                                                {container.Name}
                                            </MenuItem>
                                        ))
                                    )
                                ))}
                            </Select>
                        )}
                    />
                </FormControl>
                <FormControlLabel
                    control={
                        <Controller
                            name="data.hardReset"
                            control={control}
                            render={({ field }) => (
                                <Checkbox
                                    checked={field.value == true}
                                    onChange={(e) => field.onChange(e.target.checked ? 'true' : 'false')}
                                />
                            )}
                        />
                    }
                    label="Hard Reset"
                />
                <FormControlLabel
                    control={
                        <Controller
                            name="data.isTest"
                            control={control}
                            render={({ field }) => (
                                <Checkbox
                                    checked={field.value}
                                    onChange={(e) => field.onChange(e.target.checked)}
                                />
                            )}
                        />
                    }
                    label="Is Test"
                />
                <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    sx={{ mt: 2 }}
                    fullWidth
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} /> : null}
                >
                    {loading ? 'Sending...' : 'Send Webhook'}
                </Button>
            </form>

            {responseData && (
                <Box mt={4}>
                    <Typography variant="h6" gutterBottom>
                        Response
                    </Typography>
                    <Alert severity={!responseData.success ? 'error' : 'success'} sx={{ whiteSpace: 'pre-wrap' }}>
                        <pre>{JSON.stringify(responseData, null, 2)}</pre>
                    </Alert>
                </Box>
            )}
        </Container>
    );
};

export default Webhook;
