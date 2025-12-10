// src/api/employeesApi.ts
// Employee CRUD operations
import type { Employee } from '../types';
import { fetchWithAuth } from './client';

export const employeesApi = {
    async createEmployee(employee: Partial<Employee> & { name: string; email: string; id?: string }): Promise<Employee> {
        const response = await fetchWithAuth('/api/employees', {
            method: 'POST',
            body: JSON.stringify(employee),
        });
        return (response as { employee: Employee }).employee;
    },

    async updateEmployee(employeeId: string, updates: Partial<Employee>): Promise<Employee> {
        const response = await fetchWithAuth(`/api/employees/${employeeId}`, {
            method: 'PATCH',
            body: JSON.stringify(updates),
        });
        return (response as { employee: Employee }).employee;
    },

    async deleteEmployee(employeeId: string): Promise<void> {
        await fetchWithAuth(`/api/employees/${employeeId}`, {
            method: 'DELETE',
        });
    },
};
