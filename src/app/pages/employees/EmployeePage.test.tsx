import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import EmployeePage from './EmployeePage';
import { MemoryRouter } from 'react-router-dom';
import { DEFAULT_EMPLOYEE_CAPACITY } from '../../../constants';
import type { Employee, Location, User } from '../../../types';

interface MockProjectManager {
  employees: Employee[];
  addEmployee: ReturnType<typeof vi.fn>;
  updateEmployee: ReturnType<typeof vi.fn>;
  deleteEmployee: ReturnType<typeof vi.fn>;
  importEmployeesFromCsv: ReturnType<typeof vi.fn>;
  logout: ReturnType<typeof vi.fn>;
  currentUser: User | null;
  isSaving: boolean;
  apiError: string | null;
}

let mockProjectManager: MockProjectManager;

vi.mock('../../../hooks/useProjectManager', () => ({
  useProjectManager: () => mockProjectManager,
}));

describe('EmployeePage', () => {
  beforeEach(() => {
    mockProjectManager = {
      employees: [
        {
          id: 'emp-1',
          name: 'Alice',
          email: 'alice@example.com',
          location: 'Sano Aarhus' as Location,
          maxCapacityHoursWeek: 37.5,
        },
      ],
      addEmployee: vi.fn(),
      updateEmployee: vi.fn(),
      deleteEmployee: vi.fn(),
      importEmployeesFromCsv: vi.fn(),
      logout: vi.fn(),
      currentUser: {
        id: 'user-1',
        email: 'admin@example.com',
        name: 'Admin',
        role: 'Administrator',
      },
      isSaving: false,
      apiError: null,
    };

    vi.spyOn(window, 'alert').mockImplementation(() => void 0);
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('commits capacity updates when input blurs', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><EmployeePage /></MemoryRouter>);

    const capacityInput = screen.getByRole('textbox', { name: 'Kapacitet for Alice' });

    await user.clear(capacityInput);
    await user.type(capacityInput, '45');
    await user.tab();

    expect(mockProjectManager.updateEmployee).toHaveBeenCalledWith('emp-1', { maxCapacityHoursWeek: 45 });
    expect(screen.queryByText('Kapacitet skal være et tal større end eller lig 0.')).toBeNull();
  });

  it('resets invalid capacity input and shows an error', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><EmployeePage /></MemoryRouter>);

    const capacityInput = screen.getByRole('textbox', { name: 'Kapacitet for Alice' });

    await user.clear(capacityInput);
    await user.type(capacityInput, '-5');
    await user.tab();

    expect(mockProjectManager.updateEmployee).not.toHaveBeenCalled();
    await screen.findByText('Kapacitet skal være et tal større end eller lig 0.');
    expect((capacityInput as HTMLInputElement).value).toBe('37.5');
  });

  it('creates a new employee with capacity', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><EmployeePage /></MemoryRouter>);

    const nameInput = screen.getByPlaceholderText('Nyt navn');
    const emailInput = screen.getByPlaceholderText('Email');
    const capacityInput = screen.getByRole('textbox', { name: 'Kapacitet for ny medarbejder' });
    const addButton = screen.getByRole('button', { name: 'Tilføj' });

    await user.type(nameInput, 'Bob');
    await user.type(emailInput, 'bob@example.com');
    await user.clear(capacityInput);
    await user.type(capacityInput, '40');

    await user.click(addButton);

    expect(mockProjectManager.addEmployee).toHaveBeenCalledWith('Bob', 'Sano Aarhus', 'bob@example.com', 40);
    await waitFor(() => expect((nameInput as HTMLInputElement).value).toBe(''));
    expect((capacityInput as HTMLInputElement).value).toBe(DEFAULT_EMPLOYEE_CAPACITY.toString());
    expect(screen.queryByText('Kapacitet skal være et tal større end eller lig 0.')).toBeNull();
  });
});


