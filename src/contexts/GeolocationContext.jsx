import React, { createContext, useContext, useState, useEffect } from 'react';

const GeolocationContext = createContext();

export const useGeolocation = () => useContext(GeolocationContext);

export const GeolocationProvider = ({ children }) => {
    const [currency, setCurrency] = useState('IDR');
    const [countryCode, setCountryCode] = useState('ID');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLocation = async () => {
            try {
                // Using ipapi.co as it offers a free tier without key for low volume
                // Fallback to IDR if fetch fails
                const response = await fetch('https://ipapi.co/json/');
                const data = await response.json();

                if (data.country_code) {
                    setCountryCode(data.country_code);
                    // Default to IDR for Indonesia, USD for everywhere else
                    if (data.country_code === 'ID') {
                        setCurrency('IDR');
                    } else {
                        setCurrency('USD');
                    }
                }
            } catch (error) {
                console.warn('Failed to fetch geolocation, defaulting to IDR:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchLocation();
    }, []);

    const toggleCurrency = (newCurrency) => {
        setCurrency(newCurrency);
    };

    return (
        <GeolocationContext.Provider value={{ currency, countryCode, loading, toggleCurrency }}>
            {children}
        </GeolocationContext.Provider>
    );
};
