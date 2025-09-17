import { createContext, useState, useContext, ReactNode } from 'react';

// Define the structure of your filters
interface FilterState {
    dateRange: string;
    requestType: string;
    userType: string;
}

// Define the context type
interface FilterContextType {
    filters: FilterState;
    setFilters: (filters: Partial<FilterState>) => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

// Create the provider component
export const FilterProvider = ({ children }: { children: ReactNode }) => {
    const [filters, setFiltersState] = useState<FilterState>({
        dateRange: '30d',
        requestType: 'all',
        userType: 'all',
    });

    // Function to update filters
    const setFilters = (newFilters: Partial<FilterState>) => {
        setFiltersState(prev => ({ ...prev, ...newFilters }));
    };

    return (
        <FilterContext.Provider value={{ filters, setFilters }}>
            {children}
        </FilterContext.Provider>
    );
};

// Custom hook to easily access the context
export const useFilters = () => {
    const context = useContext(FilterContext);
    if (context === undefined) {
        throw new Error('useFilters must be used within a FilterProvider');
    }
    return context;
};