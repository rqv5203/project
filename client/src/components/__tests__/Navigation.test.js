import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Navigation from '../Navigation';

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => {
      const translations = {
        'common.dashboard': 'Dashboard',
        'common.create': 'Create'
      };
      return translations[key] || key;
    },
  }),
}));

const renderNavigationWithRouter = (initialEntries = ['/']) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Navigation />
    </MemoryRouter>
  );
};

describe('Navigation Component', () => {
  it('should render navigation links correctly', () => {
    renderNavigationWithRouter();
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Create')).toBeInTheDocument();
  });

  it('should have correct href attributes for navigation links', () => {
    renderNavigationWithRouter();
    
    const dashboardLink = screen.getByText('Dashboard').closest('a');
    const createLink = screen.getByText('Create').closest('a');
    
    expect(dashboardLink).toHaveAttribute('href', '/dashboard');
    expect(createLink).toHaveAttribute('href', '/create');
  });

  it('should apply active class to dashboard link when on dashboard route', () => {
    renderNavigationWithRouter(['/dashboard']);
    
    const dashboardLink = screen.getByText('Dashboard').closest('a');
    const createLink = screen.getByText('Create').closest('a');
    
    expect(dashboardLink).toHaveClass('nav-link active');
    expect(createLink).toHaveClass('nav-link');
    expect(createLink).not.toHaveClass('active');
  });

  it('should apply active class to create link when on create route', () => {
    renderNavigationWithRouter(['/create']);
    
    const dashboardLink = screen.getByText('Dashboard').closest('a');
    const createLink = screen.getByText('Create').closest('a');
    
    expect(createLink).toHaveClass('nav-link active');
    expect(dashboardLink).toHaveClass('nav-link');
    expect(dashboardLink).not.toHaveClass('active');
  });
}); 