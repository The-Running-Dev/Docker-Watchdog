import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

import { Info } from '../../../shared/src/models';
import { useApi } from '@/hooks/useApi';

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
    const [info, setInfo] = useState<Info>({} as Info);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const {getInfo} = useApi();

    const fetchedRef = useRef(false); // Prevent double-fetch in dev

    useEffect(() => {
        if (fetchedRef.current) {
            return;
        }

        fetchedRef.current = true;

        const fetchInfo = async () => {
            try {
                const info = await getInfo();

                setInfo(info);
            } catch (err) {
                setError('Failed to Fetch Info');
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