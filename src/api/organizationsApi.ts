/**
 * Organizations API
 * Frontend API functions for fetching organizations and locations
 */

import { fetchWithAuth } from '../api';

export interface Organization {
    id: string;
    name: string;
    code: string;
    isActive: boolean;
}

export interface Location {
    id: string;
    organizationId: string;
    name: string;
    code: string;
    isActive: boolean;
    organizationName?: string;
    organizationCode?: string;
    displayName?: string; // "Sano - Aarhus"
}

/**
 * Fetch all active organizations
 */
export const getOrganizations = async (): Promise<Organization[]> => {
    const response = await fetchWithAuth('/organizations');
    return response as Organization[];
};

/**
 * Fetch locations for a specific organization
 */
export const getLocationsByOrganization = async (organizationId: string): Promise<Location[]> => {
    const response = await fetchWithAuth(`/organizations/${organizationId}/locations`);
    return response as Location[];
};

/**
 * Fetch all locations with organization info
 */
export const getAllLocations = async (): Promise<Location[]> => {
    const response = await fetchWithAuth('/organizations/all/locations');
    return response as Location[];
};

export const organizationsApi = {
    getOrganizations,
    getLocationsByOrganization,
    getAllLocations,
};
