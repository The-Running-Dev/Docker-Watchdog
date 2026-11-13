import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

import { Info } from '../shared/models';

interface InfoContextType {
    info: Info;
    loading: boolean;
    error: string | null;
}

const InfoContext = createContext<InfoContextType | undefined>(undefined);

export const useInfo = () => {
    const context = useContext(InfoContext);

    if (!context) {
        throw new Error('useInfo Must be Used Within an InfoProvider');
    }

    return context;
};

export const InfoProvider: React.FC<{ children: React.ReactNode }> = ({children}) => {
    const [info, setInfo] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchInfo = async () => {
            try {
                const response = await axios.get('http://localhost:4000/info');

                setInfo(response.data);
            } catch (err) {
                setError('Failed to fetch info');
            } finally {
                setLoading(false);
            }
        };

        fetchInfo();
    }, []);

    return React.createElement(
        InfoContext.Provider,
        {value: {info, loading, error}},
        children
    );
};